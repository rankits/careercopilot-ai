import type { Logger } from 'pino';
import type { RecommendationUnitOfWork } from '@/modules/recommendations/contracts/recommendation.repository.js';
import {
  RECOMMENDATION_ERROR_CODES,
  RecommendationError,
} from '@/modules/recommendations/errors/recommendation.error.js';
import type { RecommendationContextService } from '@/modules/recommendations/services/recommendation-context.service.js';
import type { RecommendationRetrievalService } from '@/modules/recommendations/services/recommendation-retrieval.service.js';
import type { RecommendationScoringService } from '@/modules/recommendations/services/recommendation-scoring.service.js';
import type {
  BuildRecommendationContextInput,
  JobRecommendationRecord,
  RetrievalBackend,
} from '@/modules/recommendations/types/recommendations.types.js';
import type {
  CreateRecommendationFromTextInput,
  CreateRecommendationInput,
} from '@/modules/recommendations/validations/recommendation.schema.js';

export interface RecommendationOrchestrationDependencies {
  contextService: RecommendationContextService;
  retrievalService: RecommendationRetrievalService;
  scoringService: RecommendationScoringService;
  unitOfWork: RecommendationUnitOfWork;
}

export class RecommendationsService {
  constructor(
    private readonly logger: Logger,
    private readonly orchestration?: RecommendationOrchestrationDependencies,
  ) {}

  async createForSource(userId: string, input: CreateRecommendationInput): Promise<never> {
    this.logger.info(
      { userId, sourceType: input.sourceType, sourceId: input.sourceId },
      'Recommendation generation requested',
    );
    throw this.notImplemented(
      'Source authorization, candidate retrieval provider, and recommendation persistence models must be selected before generation can run',
    );
  }

  async generateAuthorized(
    input: BuildRecommendationContextInput,
    options: { backend: RetrievalBackend; limit: number },
  ): Promise<JobRecommendationRecord[]> {
    if (!this.orchestration) {
      throw this.notImplemented(
        'Recommendation repositories, retrieval, and scoring dependencies are not configured',
      );
    }
    const dependencies = this.orchestration;
    const run = await dependencies.unitOfWork.execute(({ runs }) =>
      runs.create({
        userId: input.userId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      }),
    );

    try {
      const context = await dependencies.contextService.build(input);
      await dependencies.unitOfWork.execute(({ runs }) =>
        runs.updateStatus(input.userId, run.id, 'RETRIEVING'),
      );
      const candidates = await dependencies.retrievalService.retrieve({
        context,
        backend: options.backend,
        limit: options.limit,
      });
      await dependencies.unitOfWork.execute(async ({ runs }) => {
        await runs.updateCandidateCount(input.userId, run.id, candidates.length);
        await runs.updateStatus(input.userId, run.id, 'SCORING');
      });
      const scored = await dependencies.scoringService.score(context, candidates);
      const records = await dependencies.unitOfWork.execute(async ({ recommendations, runs }) => {
        const created = await recommendations.createMany(input.userId, run.id, scored);
        await runs.markCompleted(input.userId, run.id);
        return created;
      });
      this.logger.info(
        { userId: input.userId, runId: run.id, candidateCount: candidates.length },
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

  async createFromText(userId: string, input: CreateRecommendationFromTextInput): Promise<never> {
    this.logger.info(
      { userId, targetTextLength: input.targetText.length },
      'Text recommendation generation requested',
    );
    throw this.notImplemented(
      'A text extraction/embedding provider, candidate retrieval provider, and recommendation persistence models must be selected before generation can run',
    );
  }

  private notImplemented(message: string): RecommendationError {
    return new RecommendationError(message, 501, RECOMMENDATION_ERROR_CODES.NOT_IMPLEMENTED);
  }
}
