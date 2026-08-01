import type {
  JobRecommendation,
  Prisma,
  RecommendationFeedback,
  RecommendationRun,
  RecommendationScoreComponent,
} from '@prisma/client';
import { prisma } from '@/shared/config/db.conf.js';
import type { IJobSearchRepository } from '@/modules/job-listing/contracts/IJobSearchRepository.js';
import type { JobListDto } from '@/modules/job-listing/types/job-listing.types.js';
import { DEFAULT_RECOMMENDATION_WEIGHTS } from '@/modules/recommendations/constants/recommendation.constants.js';
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
import type {
  JobRecommendationRecord,
  RecommendationFeedbackRecord,
  RecommendationPage,
  RecommendationReason,
  RecommendationRunRecord,
  RecommendationScoreComponentName,
  RecommendationScoreComponents,
  RecommendationScoreResult,
  ScoredJobRecommendation,
} from '@/modules/recommendations/types/recommendations.types.js';

type Tx = Prisma.TransactionClient;

const toRunRecord = (run: RecommendationRun): RecommendationRunRecord => ({
  id: run.id,
  userId: run.userId,
  sourceType: run.sourceType,
  sourceId: run.sourceId,
  status: run.status,
  candidateCount: run.candidateCount,
  failureCode: run.failureCode,
  createdAt: run.createdAt,
  completedAt: run.completedAt,
});

const toReasons = (value: Prisma.JsonValue): RecommendationReason[] => {
  if (!Array.isArray(value)) return [];
  const reasons: RecommendationReason[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    if (
      typeof record.component !== 'string' ||
      typeof record.message !== 'string' ||
      !Array.isArray(record.evidence)
    ) {
      continue;
    }
    reasons.push({
      component: record.component as RecommendationReason['component'],
      message: record.message,
      evidence: record.evidence.filter((entry): entry is string => typeof entry === 'string'),
    });
  }
  return reasons;
};

const toScoreResult = (
  recommendation: JobRecommendation & { scoreComponents: RecommendationScoreComponent[] },
): RecommendationScoreResult => {
  const components = {
    requiredSkills: 0,
    title: 0,
    experience: 0,
    responsibilities: 0,
    preferredSkills: 0,
    location: 0,
    industry: 0,
    salary: 0,
    qualifications: 0,
  } satisfies RecommendationScoreComponents;
  for (const row of recommendation.scoreComponents) {
    components[row.component] = row.score;
  }
  return {
    overallScore: recommendation.overallScore,
    components,
    matchedSkills: recommendation.matchedSkills,
    relatedSkills: recommendation.relatedSkills,
    missingSkills: recommendation.missingSkills,
    reasons: toReasons(recommendation.reasons),
  };
};

const placeholderJob = (jobId: string): JobListDto => ({
  id: jobId,
  title: 'Unavailable job',
  company: { slug: 'unknown', name: 'Unknown', logoUrl: null, verified: false },
  location: { formatted: 'Unknown', remoteType: null },
  employmentType: null,
  salary: { minimum: null, maximum: null, currency: null },
  skills: [],
  publishedAt: null,
  applyUrl: null,
});

const createRunRepository = (tx: Tx): RecommendationRunRepository => ({
  async create(input) {
    const run = await tx.recommendationRun.create({
      data: {
        userId: input.userId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      },
    });
    return toRunRecord(run);
  },

  async updateStatus(userId, runId, status) {
    const result = await tx.recommendationRun.updateMany({
      where: { id: runId, userId },
      data: { status },
    });
    if (result.count === 0) {
      throw new RecommendationError(
        'Recommendation run was not found',
        404,
        RECOMMENDATION_ERROR_CODES.RUN_NOT_FOUND,
      );
    }
    const run = await tx.recommendationRun.findFirst({ where: { id: runId, userId } });
    return toRunRecord(run!);
  },

  async updateCandidateCount(userId, runId, candidateCount) {
    const result = await tx.recommendationRun.updateMany({
      where: { id: runId, userId },
      data: { candidateCount },
    });
    if (result.count === 0) {
      throw new RecommendationError(
        'Recommendation run was not found',
        404,
        RECOMMENDATION_ERROR_CODES.RUN_NOT_FOUND,
      );
    }
    const run = await tx.recommendationRun.findFirst({ where: { id: runId, userId } });
    return toRunRecord(run!);
  },

  async markCompleted(userId, runId) {
    const result = await tx.recommendationRun.updateMany({
      where: { id: runId, userId },
      data: { status: 'COMPLETED', completedAt: new Date(), failureCode: null },
    });
    if (result.count === 0) {
      throw new RecommendationError(
        'Recommendation run was not found',
        404,
        RECOMMENDATION_ERROR_CODES.RUN_NOT_FOUND,
      );
    }
    const run = await tx.recommendationRun.findFirst({ where: { id: runId, userId } });
    return toRunRecord(run!);
  },

  async markFailed(userId, runId, failureCode) {
    const result = await tx.recommendationRun.updateMany({
      where: { id: runId, userId },
      data: { status: 'FAILED', failureCode, completedAt: new Date() },
    });
    if (result.count === 0) {
      throw new RecommendationError(
        'Recommendation run was not found',
        404,
        RECOMMENDATION_ERROR_CODES.RUN_NOT_FOUND,
      );
    }
    const run = await tx.recommendationRun.findFirst({ where: { id: runId, userId } });
    return toRunRecord(run!);
  },

  async findById(userId, runId) {
    const run = await tx.recommendationRun.findFirst({ where: { id: runId, userId } });
    return run ? toRunRecord(run) : null;
  },
});

const createRecommendationRepository = (
  tx: Tx,
  jobs: IJobSearchRepository,
): JobRecommendationRepository => {
  const hydrate = async (
    rows: Array<JobRecommendation & { scoreComponents: RecommendationScoreComponent[] }>,
  ): Promise<JobRecommendationRecord[]> => {
    const jobDtos = await jobs.findByIds(rows.map((row) => row.jobId));
    const byId = new Map(jobDtos.map((job) => [job.id, job]));
    return rows.map((row) => ({
      id: row.id,
      runId: row.runId,
      userId: row.userId,
      rank: row.rank,
      createdAt: row.createdAt,
      job: byId.get(row.jobId) ?? placeholderJob(row.jobId),
      category: row.category,
      matchType: row.matchType,
      scoreResult: toScoreResult(row),
    }));
  };

  return {
    async createMany(userId, runId, recommendations) {
      const run = await tx.recommendationRun.findFirst({ where: { id: runId, userId } });
      if (!run) {
        throw new RecommendationError(
          'Recommendation run was not found',
          404,
          RECOMMENDATION_ERROR_CODES.RUN_NOT_FOUND,
        );
      }

      const ranked = [...recommendations].sort(
        (left, right) =>
          right.scoreResult.overallScore - left.scoreResult.overallScore ||
          left.job.id.localeCompare(right.job.id),
      );

      const created: Array<
        JobRecommendation & { scoreComponents: RecommendationScoreComponent[] }
      > = [];
      for (const [index, item] of ranked.entries()) {
        const row = await tx.jobRecommendation.create({
          data: {
            runId,
            userId,
            jobId: item.job.id,
            overallScore: item.scoreResult.overallScore,
            category: item.category,
            matchType: item.matchType,
            rank: index + 1,
            matchedSkills: item.scoreResult.matchedSkills,
            relatedSkills: item.scoreResult.relatedSkills,
            missingSkills: item.scoreResult.missingSkills,
            reasons: item.scoreResult.reasons as unknown as Prisma.InputJsonValue,
            scoreComponents: {
              create: (
                Object.keys(DEFAULT_RECOMMENDATION_WEIGHTS) as RecommendationScoreComponentName[]
              ).map((component) => ({
                component,
                weight: DEFAULT_RECOMMENDATION_WEIGHTS[component],
                score: item.scoreResult.components[component],
                explanationMetadata: {
                  reasons: item.scoreResult.reasons.filter(
                    (reason) => reason.component === component,
                  ),
                } as unknown as Prisma.InputJsonValue,
              })),
            },
          },
          include: { scoreComponents: true },
        });
        created.push(row);
      }
      return created.map((row, index) => ({
        id: row.id,
        runId: row.runId,
        userId: row.userId,
        rank: row.rank,
        createdAt: row.createdAt,
        job: ranked[index]!.job,
        category: row.category,
        matchType: row.matchType,
        scoreResult: toScoreResult(row),
      }));
    },

    async findById(userId, recommendationId) {
      const row = await tx.jobRecommendation.findFirst({
        where: { id: recommendationId, userId },
        include: { scoreComponents: true },
      });
      if (!row) return null;
      const [record] = await hydrate([row]);
      return record ?? null;
    },

    async listByRun(userId, runId, pagination) {
      const where = { userId, runId };
      const [total, rows] = await Promise.all([
        tx.jobRecommendation.count({ where }),
        tx.jobRecommendation.findMany({
          where,
          include: { scoreComponents: true },
          orderBy: { rank: 'asc' },
          skip: (pagination.page - 1) * pagination.limit,
          take: pagination.limit,
        }),
      ]);
      return {
        items: await hydrate(rows),
        page: pagination.page,
        limit: pagination.limit,
        total,
      };
    },

    async listByUser(userId, pagination) {
      const where = { userId };
      const [total, rows] = await Promise.all([
        tx.jobRecommendation.count({ where }),
        tx.jobRecommendation.findMany({
          where,
          include: { scoreComponents: true },
          orderBy: [{ createdAt: 'desc' }, { rank: 'asc' }, { id: 'asc' }],
          skip: (pagination.page - 1) * pagination.limit,
          take: pagination.limit,
        }),
      ]);
      return {
        items: await hydrate(rows),
        page: pagination.page,
        limit: pagination.limit,
        total,
      };
    },

    async existsByRunAndJob(userId, runId, jobId) {
      const count = await tx.jobRecommendation.count({ where: { userId, runId, jobId } });
      return count > 0;
    },
  };
};

const toFeedbackRecord = (row: RecommendationFeedback): RecommendationFeedbackRecord => ({
  id: row.id,
  recommendationId: row.recommendationId,
  jobId: row.jobId,
  userId: row.userId,
  action: row.action,
  note: row.note,
  createdAt: row.createdAt,
});

const createFeedbackRepository = (tx: Tx): RecommendationFeedbackRepository => ({
  async upsert(input) {
    const owned = await tx.jobRecommendation.findFirst({
      where: { id: input.recommendationId, userId: input.userId },
      select: { id: true, jobId: true },
    });
    if (!owned || owned.jobId !== input.jobId) {
      throw new RecommendationError(
        'Recommendation was not found',
        404,
        RECOMMENDATION_ERROR_CODES.RECOMMENDATION_NOT_FOUND,
      );
    }

    const row = await tx.recommendationFeedback.upsert({
      where: {
        userId_recommendationId: {
          userId: input.userId,
          recommendationId: input.recommendationId,
        },
      },
      create: {
        userId: input.userId,
        recommendationId: input.recommendationId,
        jobId: input.jobId,
        action: input.action,
        note: input.note,
      },
      update: {
        action: input.action,
        note: input.note ?? null,
        jobId: input.jobId,
      },
    });
    return toFeedbackRecord(row);
  },

  async findByRecommendation(userId, recommendationId) {
    const row = await tx.recommendationFeedback.findFirst({
      where: { userId, recommendationId },
    });
    return row ? toFeedbackRecord(row) : null;
  },

  async listByJob(userId, jobId) {
    const rows = await tx.recommendationFeedback.findMany({
      where: { userId, jobId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toFeedbackRecord);
  },
});

export class PrismaRecommendationUnitOfWork implements RecommendationUnitOfWork {
  constructor(private readonly jobs: IJobSearchRepository) {}

  execute<T>(
    operation: (repositories: {
      runs: RecommendationRunRepository;
      recommendations: JobRecommendationRepository;
      feedback: RecommendationFeedbackRepository;
    }) => Promise<T>,
  ): Promise<T> {
    return prisma.$transaction((tx) =>
      operation({
        runs: createRunRepository(tx),
        recommendations: createRecommendationRepository(tx, this.jobs),
        feedback: createFeedbackRepository(tx),
      }),
    );
  }
}
