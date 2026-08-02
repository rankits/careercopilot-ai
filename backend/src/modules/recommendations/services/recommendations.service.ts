import type { Logger } from 'pino';
import type { RecommendationUnitOfWork } from '@/modules/recommendations/contracts/recommendation.repository.js';
import {
  DEFAULT_RECOMMENDATION_LIMIT,
  DEFAULT_RETRIEVAL_BACKEND,
} from '@/modules/recommendations/constants/recommendation.constants.js';
import {
  RECOMMENDATION_ERROR_CODES,
  RecommendationError,
} from '@/modules/recommendations/errors/recommendation.error.js';
import type { RecommendationContextService } from '@/modules/recommendations/services/recommendation-context.service.js';
import type { RecommendationRetrievalService } from '@/modules/recommendations/services/recommendation-retrieval.service.js';
import type { RecommendationScoringService } from '@/modules/recommendations/services/recommendation-scoring.service.js';
import type { RecommendationSourceAuthorizationService } from '@/modules/recommendations/services/recommendation-source-authorization.service.js';
import {
  countEmbeddingCoverage,
  findLatestRecommendationGeneratedAt,
  findLatestRecommendationRun,
  isRecommendationSetStale,
  mapRecommendationLifecycleState,
} from '@/modules/recommendations/services/recommendation-readiness.helpers.js';
import { recordRecommendationGenerate } from '@/modules/recommendations/observability/recommendation.metrics.js';
import { withRecommendationTimeout } from '@/modules/recommendations/utils/recommendation-timeout.js';
import { applyRecommendationFilters } from '@/modules/recommendations/utils/apply-recommendation-filters.js';
import { resolveRecommendationFilterMode } from '@/modules/recommendations/utils/candidate-job-filters.js';
import type {
  BuildRecommendationContextInput,
  JobRecommendationRecord,
  RecommendationPage,
  RecommendationFilterMode,
  RecommendationReadinessStatus,
  RecommendationRunPage,
  RetrievalBackend,
} from '@/modules/recommendations/types/recommendations.types.js';
import type {
  CreateRecommendationFromTextInput,
  CreateRecommendationInput,
  RecommendationFiltersDto,
} from '@/modules/recommendations/validations/recommendation.schema.js';

export interface RecommendationOrchestrationDependencies {
  contextService: RecommendationContextService;
  retrievalService: RecommendationRetrievalService;
  scoringService: RecommendationScoringService;
  unitOfWork: RecommendationUnitOfWork;
  sourceAuthorization: RecommendationSourceAuthorizationService;
  profileUpdatedAfter?: (userId: string, timestamp: Date) => Promise<boolean>;
}

export class RecommendationsService {
  constructor(
    private readonly logger: Logger,
    private readonly orchestration?: RecommendationOrchestrationDependencies,
  ) {}

  async createForSource(
    userId: string,
    input: CreateRecommendationInput,
  ): Promise<JobRecommendationRecord[]> {
    // userId is String(User.id) from JWT principalId — same value persisted on runs/recommendations.
    this.logger.info(
      { userId, sourceType: input.sourceType, sourceId: input.sourceId },
      'Recommendation generation requested',
    );
    if (input.sourceType === 'JOB') {
      this.logger.info(
        {
          userId,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          audit: 'recommendation.job_source.generate',
        },
        'JOB source recommendation generation audit',
      );
    }
    const dependencies = this.requireOrchestration();
    const authorized = await dependencies.sourceAuthorization.authorizeForSource(userId, input);
    return this.generateAuthorized(authorized, {
      expectedUserId: userId,
      backend: DEFAULT_RETRIEVAL_BACKEND,
      limit: DEFAULT_RECOMMENDATION_LIMIT,
      filters: input.filters,
      excludeJobIds:
        authorized.sourceType === 'JOB' && authorized.sourceId ? [authorized.sourceId] : undefined,
    });
  }

  async createFromText(
    userId: string,
    input: CreateRecommendationFromTextInput,
  ): Promise<JobRecommendationRecord[]> {
    this.logger.info(
      { userId, targetTextLength: input.targetText.length },
      'Text recommendation generation requested',
    );
    const dependencies = this.requireOrchestration();
    const authorized = dependencies.sourceAuthorization.authorizeFromText(userId, input);
    return this.generateAuthorized(authorized, {
      expectedUserId: userId,
      backend: DEFAULT_RETRIEVAL_BACKEND,
      limit: DEFAULT_RECOMMENDATION_LIMIT,
      filters: input.filters,
    });
  }

  async refreshForSource(
    userId: string,
    input: CreateRecommendationInput = { sourceType: 'PROFILE' },
  ): Promise<RecommendationRunPage> {
    this.logger.info(
      { userId, sourceType: input.sourceType, sourceId: input.sourceId },
      'Recommendation refresh requested',
    );
    const dependencies = this.requireOrchestration();
    const authorized = await dependencies.sourceAuthorization.authorizeForSource(userId, input);
    const records = await this.generateAuthorized(authorized, {
      expectedUserId: userId,
      backend: DEFAULT_RETRIEVAL_BACKEND,
      limit: DEFAULT_RECOMMENDATION_LIMIT,
      filters: input.filters,
      excludeJobIds:
        authorized.sourceType === 'JOB' && authorized.sourceId ? [authorized.sourceId] : undefined,
    });
    const runId = records[0]?.runId;
    if (!runId) {
      throw new RecommendationError(
        'Recommendation run was not found',
        404,
        RECOMMENDATION_ERROR_CODES.RUN_NOT_FOUND,
      );
    }
    return this.getRunDetailsForUser(userId, runId, {
      page: 1,
      limit: Math.max(records.length, DEFAULT_RECOMMENDATION_LIMIT),
    });
  }

  async generateAuthorized(
    input: BuildRecommendationContextInput,
    options: {
      expectedUserId?: string;
      backend: RetrievalBackend;
      limit: number;
      filters?: RecommendationFiltersDto;
      excludeJobIds?: string[];
    },
  ): Promise<JobRecommendationRecord[]> {
    const startedAt = Date.now();
    let filterMode: RecommendationFilterMode | undefined = options.filters?.filterMode;
    const dependencies = this.requireOrchestration();
    this.assertPrincipalUserId(input.userId, options.expectedUserId);
    const run = await dependencies.unitOfWork.execute(({ runs }) =>
      runs.create({
        userId: input.userId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      }),
    );

    try {
      return await withRecommendationTimeout(async () => {
        const built = await dependencies.contextService.build(input);
        const context = applyRecommendationFilters(built, options.filters);
        filterMode = resolveRecommendationFilterMode(context);
        await dependencies.unitOfWork.execute(({ runs }) =>
          runs.updateStatus(input.userId, run.id, 'RETRIEVING'),
        );
        const excludedJobIds = await dependencies.unitOfWork.execute(({ feedback }) =>
          feedback.listExcludedJobIds(input.userId),
        );
        const excludeJobIds = [...new Set([...(options.excludeJobIds ?? []), ...excludedJobIds])];
        const candidates = await dependencies.retrievalService.retrieve({
          context,
          backend: options.backend,
          limit: options.limit,
          excludeJobIds: excludeJobIds.length > 0 ? excludeJobIds : undefined,
        });
        await dependencies.unitOfWork.execute(async ({ runs }) => {
          await runs.updateCandidateCount(input.userId, run.id, candidates.length);
          await runs.updateStatus(input.userId, run.id, 'SCORING');
        });
        const scored = await dependencies.scoringService.score(context, candidates);
        const eligible =
          options.filters?.includeStretchOpportunities === false
            ? scored.filter(
                (item) => item.category === 'BEST_MATCH' || item.category === 'GOOD_MATCH',
              )
            : scored;
        if (eligible.length === 0) {
          throw new RecommendationError(
            'No eligible jobs were found for this recommendation context',
            404,
            RECOMMENDATION_ERROR_CODES.NO_ELIGIBLE_JOBS_FOUND,
          );
        }
        const records = await dependencies.unitOfWork.execute(async ({ recommendations, runs }) => {
          const created = await recommendations.createMany(input.userId, run.id, eligible);
          this.assertPersistedOwnership(input.userId, run.id, created);
          await runs.markCompleted(input.userId, run.id);
          return created;
        });
        recordRecommendationGenerate(this.logger, {
          userId: input.userId,
          runId: run.id,
          candidateCount: eligible.length,
          durationMs: Date.now() - startedAt,
          success: true,
          filterMode,
          empty: false,
        });
        this.logger.info(
          { userId: input.userId, runId: run.id, candidateCount: eligible.length },
          'Recommendation generation completed',
        );
        return records;
      });
    } catch (error) {
      const failureCode =
        error instanceof RecommendationError
          ? (error.code ?? RECOMMENDATION_ERROR_CODES.GENERATION_FAILED)
          : error instanceof Error && error.message === 'RECOMMENDATION_GENERATION_TIMEOUT'
            ? 'RECOMMENDATION_GENERATION_TIMEOUT'
            : RECOMMENDATION_ERROR_CODES.GENERATION_FAILED;
      await dependencies.unitOfWork.execute(({ runs }) =>
        runs.markFailed(input.userId, run.id, failureCode),
      );
      recordRecommendationGenerate(this.logger, {
        userId: input.userId,
        runId: run.id,
        candidateCount: 0,
        durationMs: Date.now() - startedAt,
        success: false,
        filterMode,
        failureCode,
        empty: failureCode === RECOMMENDATION_ERROR_CODES.NO_ELIGIBLE_JOBS_FOUND,
      });
      if (error instanceof Error && error.message === 'RECOMMENDATION_GENERATION_TIMEOUT') {
        throw new RecommendationError(
          'Recommendation generation timed out',
          504,
          RECOMMENDATION_ERROR_CODES.GENERATION_FAILED,
        );
      }
      throw error;
    }
  }

  async listForUser(
    userId: string,
    pagination: { page: number; limit: number },
    filters: { runId?: string; latestOnly?: boolean } = {},
  ): Promise<RecommendationPage> {
    const dependencies = this.requireOrchestration();
    if (filters.runId) {
      return this.getRunDetailsForUser(userId, filters.runId, pagination);
    }
    if (filters.latestOnly) {
      const latestRun = await dependencies.unitOfWork.execute(({ runs }) =>
        runs.findLatestByUser(userId),
      );
      if (!latestRun) {
        return { items: [], page: pagination.page, limit: pagination.limit, total: 0 };
      }
      return dependencies.unitOfWork.execute(({ recommendations }) =>
        recommendations.listByRun(userId, latestRun.id, pagination),
      );
    }
    return dependencies.unitOfWork.execute(({ recommendations }) =>
      recommendations.listByUser(userId, pagination),
    );
  }

  async getRunDetailsForUser(
    userId: string,
    runId: string,
    pagination: { page: number; limit: number },
  ): Promise<RecommendationRunPage> {
    const dependencies = this.requireOrchestration();
    return dependencies.unitOfWork.execute(async ({ runs, recommendations }) => {
      const run = await runs.findById(userId, runId);
      if (!run) {
        throw new RecommendationError(
          'Recommendation run was not found',
          404,
          RECOMMENDATION_ERROR_CODES.RUN_NOT_FOUND,
        );
      }
      const page = await recommendations.listByRun(userId, run.id, pagination);
      return { ...page, run };
    });
  }

  async getForUser(userId: string, recommendationId: string): Promise<JobRecommendationRecord> {
    const dependencies = this.requireOrchestration();
    const record = await dependencies.unitOfWork.execute(({ recommendations }) =>
      recommendations.findById(userId, recommendationId),
    );
    if (!record) {
      throw new RecommendationError(
        'Recommendation was not found',
        404,
        RECOMMENDATION_ERROR_CODES.RECOMMENDATION_NOT_FOUND,
      );
    }
    return record;
  }

  async getReadinessStatus(userId: string): Promise<RecommendationReadinessStatus> {
    const dependencies = this.requireOrchestration();
    const blockers: string[] = [];
    let canGenerateFromProfile = false;

    try {
      await dependencies.sourceAuthorization.authorizeForSource(userId, { sourceType: 'PROFILE' });
      canGenerateFromProfile = true;
    } catch (error) {
      if (error instanceof RecommendationError) {
        if (error.statusCode === 422) {
          blockers.push('PROFILE_INCOMPLETE');
        } else if (error.statusCode === 404) {
          blockers.push('PROFILE_NOT_FOUND');
        } else {
          blockers.push('PROFILE_UNAVAILABLE');
        }
      } else {
        blockers.push('PROFILE_UNAVAILABLE');
      }
    }

    let coverage = { activeJobs: 0, embeddedJobs: 0, coverageRatio: 1 };
    try {
      coverage = await countEmbeddingCoverage();
    } catch {
      coverage = { activeJobs: 0, embeddedJobs: 0, coverageRatio: 1 };
    }
    const [latestRun, latestRecommendationCreatedAt] = await Promise.all([
      findLatestRecommendationRun(dependencies.unitOfWork, userId),
      findLatestRecommendationGeneratedAt(dependencies.unitOfWork, userId),
    ]);
    const lastGeneratedAt =
      latestRun?.status === 'COMPLETED'
        ? (latestRun.completedAt ?? latestRecommendationCreatedAt)
        : latestRecommendationCreatedAt;
    const stale = await isRecommendationSetStale(
      {
        unitOfWork: dependencies.unitOfWork,
        jobEmbeddings: { searchNearest: async () => [] } as never,
        profileUpdatedAfter: dependencies.profileUpdatedAfter,
      },
      userId,
      lastGeneratedAt,
    );
    if (stale) {
      blockers.push('RECOMMENDATIONS_STALE');
    }
    if (coverage.coverageRatio < 0.25 && coverage.activeJobs > 0) {
      blockers.push('EMBEDDING_COVERAGE_LOW');
    }
    const lifecycleState = mapRecommendationLifecycleState({ latestRun, stale });

    return {
      ready: canGenerateFromProfile && blockers.every((b) => b === 'RECOMMENDATIONS_STALE'),
      lifecycleState,
      canGenerateFromProfile,
      blockers,
      stale,
      lastGeneratedAt: lastGeneratedAt?.toISOString() ?? null,
      retrieval: {
        backend: DEFAULT_RETRIEVAL_BACKEND,
        configured: true,
        embeddingCoverageRatio: coverage.coverageRatio,
      },
    };
  }

  private requireOrchestration(): RecommendationOrchestrationDependencies {
    if (!this.orchestration) {
      throw new RecommendationError(
        'Recommendation repositories, retrieval, and scoring dependencies are not configured',
        501,
        RECOMMENDATION_ERROR_CODES.NOT_IMPLEMENTED,
      );
    }
    return this.orchestration;
  }

  private assertPrincipalUserId(authorizedUserId: string, expectedUserId?: string): void {
    if (expectedUserId === undefined || authorizedUserId === expectedUserId) return;
    throw new RecommendationError(
      'Recommendation context user does not match authenticated principal',
      403,
      RECOMMENDATION_ERROR_CODES.ACCESS_DENIED,
    );
  }

  private assertPersistedOwnership(
    userId: string,
    runId: string,
    records: readonly JobRecommendationRecord[],
  ): void {
    const mismatch = records.some((record) => record.userId !== userId || record.runId !== runId);
    if (!mismatch) return;
    throw new RecommendationError(
      'Recommendation persistence violated user ownership invariant',
      500,
      RECOMMENDATION_ERROR_CODES.GENERATION_FAILED,
    );
  }
}
