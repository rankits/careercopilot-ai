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
import { applyRecommendationFilters } from '@/modules/recommendations/utils/apply-recommendation-filters.js';
import type {
  BuildRecommendationContextInput,
  JobRecommendationRecord,
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
    this.logger.info(
      { userId, sourceType: input.sourceType, sourceId: input.sourceId },
      'Recommendation generation requested',
    );
    const dependencies = this.requireOrchestration();
    const authorized = await dependencies.sourceAuthorization.authorizeForSource(userId, input);
    return this.generateAuthorized(authorized, {
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
      backend: DEFAULT_RETRIEVAL_BACKEND,
      limit: DEFAULT_RECOMMENDATION_LIMIT,
      filters: input.filters,
    });
  }

  async generateAuthorized(
    input: BuildRecommendationContextInput,
    options: {
      backend: RetrievalBackend;
      limit: number;
      filters?: RecommendationFiltersDto;
      excludeJobIds?: string[];
    },
  ): Promise<JobRecommendationRecord[]> {
    const dependencies = this.requireOrchestration();
    const run = await dependencies.unitOfWork.execute(({ runs }) =>
      runs.create({
        userId: input.userId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      }),
    );

    try {
      const built = await dependencies.contextService.build(input);
      const context = applyRecommendationFilters(built, options.filters);
      await dependencies.unitOfWork.execute(({ runs }) =>
        runs.updateStatus(input.userId, run.id, 'RETRIEVING'),
      );
      const candidates = await dependencies.retrievalService.retrieve({
        context,
        backend: options.backend,
        limit: options.limit,
        excludeJobIds: options.excludeJobIds,
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
        await runs.markCompleted(input.userId, run.id);
        return created;
      });
      this.logger.info(
        { userId: input.userId, runId: run.id, candidateCount: eligible.length },
        'Recommendation generation completed',
      );
      return records;
    } catch (error) {
      await dependencies.unitOfWork.execute(({ runs }) =>
        runs.markFailed(input.userId, run.id, RECOMMENDATION_ERROR_CODES.GENERATION_FAILED),
      );
      throw error;
    }
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
}
