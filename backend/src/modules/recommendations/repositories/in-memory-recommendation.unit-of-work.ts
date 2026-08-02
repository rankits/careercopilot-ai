import { randomUUID } from 'node:crypto';
import type {
  JobRecommendationRepository,
  RecommendationFeedbackRepository,
  RecommendationRunRepository,
  RecommendationUnitOfWork,
} from '@/modules/recommendations/contracts/recommendation.repository.js';
import {
  RECOMMENDATION_ERROR_CODES,
  RecommendationError,
} from '@/modules/recommendations/errors/recommendation.error.js';
import { sortRecommendationsForRanking } from '@/modules/recommendations/utils/recommendation-ranking.js';
import { isRecommendationJobEligible } from '@/modules/recommendations/utils/recommendation-job-eligibility.js';
import { recordJobRecommendationHidden } from '@/modules/recommendations/observability/recommendation.metrics.js';
import type {
  JobRecommendationRecord,
  RecommendationFeedbackRecord,
  RecommendationPage,
  RecommendationRunRecord,
  RecommendationRunStatus,
  RecommendationSourceType,
  ScoredJobRecommendation,
} from '@/modules/recommendations/types/recommendations.types.js';
import { RETRIEVAL_EXCLUSION_FEEDBACK_ACTIONS } from '@/modules/recommendations/constants/recommendation-feedback.constants.js';

/**
 * Process-local recommendation store for unit tests and ephemeral local runs.
 * Production DI uses {@link PrismaRecommendationUnitOfWork}.
 */
export class InMemoryRecommendationUnitOfWork implements RecommendationUnitOfWork {
  private readonly runs = new Map<string, RecommendationRunRecord>();
  private readonly recommendations = new Map<string, JobRecommendationRecord>();
  private readonly feedback = new Map<string, RecommendationFeedbackRecord>();

  private readonly runRepository: RecommendationRunRepository = {
    create: async (input: {
      userId: string;
      sourceType: RecommendationSourceType;
      sourceId?: string;
    }): Promise<RecommendationRunRecord> => {
      const record: RecommendationRunRecord = {
        id: randomUUID(),
        userId: input.userId,
        sourceType: input.sourceType,
        sourceId: input.sourceId ?? null,
        status: 'PENDING',
        candidateCount: 0,
        failureCode: null,
        createdAt: new Date(),
        completedAt: null,
      };
      this.runs.set(record.id, record);
      return { ...record };
    },

    updateStatus: async (
      userId: string,
      runId: string,
      status: RecommendationRunStatus,
    ): Promise<RecommendationRunRecord> => {
      const run = this.requireRun(userId, runId);
      run.status = status;
      return { ...run };
    },

    updateCandidateCount: async (
      userId: string,
      runId: string,
      candidateCount: number,
    ): Promise<RecommendationRunRecord> => {
      const run = this.requireRun(userId, runId);
      run.candidateCount = candidateCount;
      return { ...run };
    },

    markCompleted: async (userId: string, runId: string): Promise<RecommendationRunRecord> => {
      const run = this.requireRun(userId, runId);
      run.status = 'COMPLETED';
      run.completedAt = new Date();
      run.failureCode = null;
      return { ...run };
    },

    markFailed: async (
      userId: string,
      runId: string,
      failureCode: string,
    ): Promise<RecommendationRunRecord> => {
      const run = this.requireRun(userId, runId);
      run.status = 'FAILED';
      run.failureCode = failureCode;
      run.completedAt = new Date();
      return { ...run };
    },

    findById: async (userId: string, runId: string): Promise<RecommendationRunRecord | null> => {
      const run = this.runs.get(runId);
      if (!run || run.userId !== userId) return null;
      return { ...run };
    },

    findLatestByUser: async (userId: string): Promise<RecommendationRunRecord | null> => {
      const [latest] = [...this.runs.values()]
        .filter((run) => run.userId === userId)
        .sort(
          (left, right) =>
            right.createdAt.getTime() - left.createdAt.getTime() ||
            right.id.localeCompare(left.id),
        );
      return latest ? { ...latest } : null;
    },
  };

  private readonly recommendationRepository: JobRecommendationRepository = {
    createMany: async (
      userId: string,
      runId: string,
      recommendations: readonly ScoredJobRecommendation[],
      options?: { preserveOrder?: boolean },
    ): Promise<JobRecommendationRecord[]> => {
      this.requireRun(userId, runId);
      const ranked = options?.preserveOrder
        ? [...recommendations]
        : sortRecommendationsForRanking(recommendations);
      const created = ranked.map((item, index): JobRecommendationRecord => {
        const record: JobRecommendationRecord = {
          id: randomUUID(),
          runId,
          userId,
          rank: index + 1,
          createdAt: new Date(),
          ...item,
        };
        this.recommendations.set(record.id, record);
        return { ...record, job: { ...record.job }, scoreResult: { ...record.scoreResult } };
      });
      return created;
    },

    findById: async (
      userId: string,
      recommendationId: string,
    ): Promise<JobRecommendationRecord | null> => {
      const record = this.recommendations.get(recommendationId);
      if (!record || record.userId !== userId) return null;
      if (!isRecommendationJobEligible(record.job)) {
        recordJobRecommendationHidden();
        return null;
      }
      return { ...record };
    },

    listByRun: async (
      userId: string,
      runId: string,
      pagination: { page: number; limit: number },
    ): Promise<RecommendationPage> => {
      const items = [...this.recommendations.values()]
        .filter((item) => item.userId === userId && item.runId === runId)
        .sort((left, right) => left.rank - right.rank);
      const visible = items.filter((item) => isRecommendationJobEligible(item.job));
      recordJobRecommendationHidden(items.length - visible.length);
      return paginate(visible, pagination);
    },

    listByUser: async (
      userId: string,
      pagination: { page: number; limit: number },
    ): Promise<RecommendationPage> => {
      const items = [...this.recommendations.values()]
        .filter((item) => item.userId === userId)
        .sort(
          (left, right) =>
            right.createdAt.getTime() - left.createdAt.getTime() ||
            left.rank - right.rank ||
            left.id.localeCompare(right.id),
        );
      const visible = items.filter((item) => isRecommendationJobEligible(item.job));
      recordJobRecommendationHidden(items.length - visible.length);
      return paginate(visible, pagination);
    },

    existsByRunAndJob: async (userId: string, runId: string, jobId: string): Promise<boolean> =>
      [...this.recommendations.values()].some(
        (item) => item.userId === userId && item.runId === runId && item.job.id === jobId,
      ),
  };

  private readonly feedbackRepository: RecommendationFeedbackRepository = {
    upsert: async (input): Promise<RecommendationFeedbackRecord> => {
      const recommendation = this.recommendations.get(input.recommendationId);
      if (
        !recommendation ||
        recommendation.userId !== input.userId ||
        recommendation.job.id !== input.jobId
      ) {
        throw new RecommendationError(
          'Recommendation was not found',
          404,
          RECOMMENDATION_ERROR_CODES.RECOMMENDATION_NOT_FOUND,
        );
      }
      const key = `${input.userId}:${input.recommendationId}`;
      const existing = this.feedback.get(key);
      const record: RecommendationFeedbackRecord = {
        id: existing?.id ?? randomUUID(),
        recommendationId: input.recommendationId,
        jobId: input.jobId,
        userId: input.userId,
        action: input.action,
        note: input.note ?? null,
        createdAt: existing?.createdAt ?? new Date(),
      };
      this.feedback.set(key, record);
      return { ...record };
    },
    findByRecommendation: async (userId, recommendationId) => {
      const record = this.feedback.get(`${userId}:${recommendationId}`);
      return record ? { ...record } : null;
    },
    listByJob: async (userId, jobId) =>
      [...this.feedback.values()]
        .filter((item) => item.userId === userId && item.jobId === jobId)
        .map((item) => ({ ...item })),
    listByAction: async (userId, action, options) =>
      [...this.feedback.values()]
        .filter((item) => item.userId === userId && item.action === action)
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
        .slice(0, options?.limit)
        .map((item) => ({ ...item })),
    listExcludedJobIds: async (userId) => {
      const ids = new Set<string>();
      for (const item of this.feedback.values()) {
        if (item.userId !== userId) continue;
        if ((RETRIEVAL_EXCLUSION_FEEDBACK_ACTIONS as readonly string[]).includes(item.action)) {
          ids.add(item.jobId);
        }
      }
      return [...ids];
    },
  };

  async execute<T>(
    operation: (repositories: {
      runs: RecommendationRunRepository;
      recommendations: JobRecommendationRepository;
      feedback: RecommendationFeedbackRepository;
    }) => Promise<T>,
  ): Promise<T> {
    return operation({
      runs: this.runRepository,
      recommendations: this.recommendationRepository,
      feedback: this.feedbackRepository,
    });
  }

  private requireRun(userId: string, runId: string): RecommendationRunRecord {
    const run = this.runs.get(runId);
    if (!run || run.userId !== userId) {
      throw new RecommendationError(
        'Recommendation run was not found',
        404,
        RECOMMENDATION_ERROR_CODES.RUN_NOT_FOUND,
      );
    }
    return run;
  }
}

const paginate = (
  items: JobRecommendationRecord[],
  pagination: { page: number; limit: number },
): RecommendationPage => {
  const start = (pagination.page - 1) * pagination.limit;
  return {
    items: items.slice(start, start + pagination.limit).map((item) => ({ ...item })),
    page: pagination.page,
    limit: pagination.limit,
    total: items.length,
  };
};
