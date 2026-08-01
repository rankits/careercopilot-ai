import { createRecommendationsRouter } from '@/modules/recommendations/routes/recommendations.route.js';
import { RecommendationsService } from '@/modules/recommendations/services/recommendations.service.js';
import {
  CareerGoalSourceStrategy,
  JobSourceStrategy,
  ProfileSourceStrategy,
  ResumeSourceStrategy,
  SavedSearchSourceStrategy,
  TargetTextSourceStrategy,
} from '@/modules/recommendations/strategies/recommendation-source.strategy.js';
import { RecommendationStrategyResolver } from '@/modules/recommendations/strategies/recommendation-strategy.resolver.js';
import { RecommendationContextService } from '@/modules/recommendations/services/recommendation-context.service.js';
import { RecommendationRetrievalService } from '@/modules/recommendations/services/recommendation-retrieval.service.js';
import { RecommendationScoringService } from '@/modules/recommendations/services/recommendation-scoring.service.js';
import { RecommendationSourceAuthorizationService } from '@/modules/recommendations/services/recommendation-source-authorization.service.js';
import { SimilarJobsService } from '@/modules/recommendations/services/similar-jobs.service.js';
import { CandidateRetrievalRegistry } from '@/modules/recommendations/providers/candidate-retrieval.registry.js';
import { PgVectorCandidateRetrievalProvider } from '@/modules/recommendations/providers/pgvector-candidate-retrieval.provider.js';
import { RecommendationScoringEngine } from '@/modules/recommendations/scoring/recommendation-scoring.engine.js';
import { HEURISTIC_SCORE_CALCULATORS } from '@/modules/recommendations/scoring/calculators/heuristic-score.calculators.js';
import { defaultMatchTypeClassifier } from '@/modules/recommendations/scoring/default-match-type.classifier.js';
import { PrismaRecommendationUnitOfWork } from '@/modules/recommendations/repositories/prisma-recommendation.unit-of-work.js';
import { RecommendationFeedbackService } from '@/modules/recommendations/services/recommendation-feedback.service.js';
import { createResumeRecommendationSourceLoader } from '@/modules/recommendations/adapters/resume-recommendation-source.loader.js';
import { profileUpdatedAfter } from '@/modules/recommendations/services/recommendation-lifecycle.service.js';
import { jobEmbeddingRepository } from '@/modules/job-embeddings/index.js';
import { prismaJobSearchRepository } from '@/modules/job-listing/index.js';
import { createChildLogger } from '@/shared/logger/logger.js';

export const recommendationsLogger = createChildLogger({ scope: 'job-recommendations' });
export const recommendationStrategyResolver = new RecommendationStrategyResolver([
  new ProfileSourceStrategy(),
  new ResumeSourceStrategy(),
  new JobSourceStrategy(),
  new TargetTextSourceStrategy(),
  new CareerGoalSourceStrategy(),
  new SavedSearchSourceStrategy(),
]);
export const pgVectorCandidateRetrievalProvider = new PgVectorCandidateRetrievalProvider(
  jobEmbeddingRepository,
  prismaJobSearchRepository,
);
export const candidateRetrievalRegistry = new CandidateRetrievalRegistry([
  pgVectorCandidateRetrievalProvider,
]);
export const recommendationContextService = new RecommendationContextService(
  recommendationStrategyResolver,
);
export const recommendationRetrievalService = new RecommendationRetrievalService(
  candidateRetrievalRegistry,
);
export const recommendationScoringEngine = new RecommendationScoringEngine(
  HEURISTIC_SCORE_CALCULATORS,
  defaultMatchTypeClassifier,
);
export const recommendationScoringService = new RecommendationScoringService(
  recommendationScoringEngine,
);
export const recommendationSourceLoader = createResumeRecommendationSourceLoader();
export const recommendationSourceAuthorizationService =
  new RecommendationSourceAuthorizationService(
    prismaJobSearchRepository,
    recommendationSourceLoader,
  );
export const recommendationUnitOfWork = new PrismaRecommendationUnitOfWork(
  prismaJobSearchRepository,
);
export const recommendationsService = new RecommendationsService(recommendationsLogger, {
  contextService: recommendationContextService,
  retrievalService: recommendationRetrievalService,
  scoringService: recommendationScoringService,
  unitOfWork: recommendationUnitOfWork,
  sourceAuthorization: recommendationSourceAuthorizationService,
  profileUpdatedAfter,
});
export const recommendationFeedbackService = new RecommendationFeedbackService({
  upsert: (input) => recommendationUnitOfWork.execute(({ feedback }) => feedback.upsert(input)),
  findByRecommendation: (userId, recommendationId) =>
    recommendationUnitOfWork.execute(({ feedback }) =>
      feedback.findByRecommendation(userId, recommendationId),
    ),
  listByJob: (userId, jobId) =>
    recommendationUnitOfWork.execute(({ feedback }) => feedback.listByJob(userId, jobId)),
});
export const similarJobsService = new SimilarJobsService(
  recommendationSourceAuthorizationService,
  recommendationContextService,
  recommendationRetrievalService,
  recommendationScoringService,
);
export const recommendationsRoutes = createRecommendationsRouter(
  recommendationsService,
  similarJobsService,
  recommendationFeedbackService,
);

export * from '@/modules/recommendations/types/recommendations.types.js';
export * from '@/modules/recommendations/constants/recommendation.constants.js';
export * from '@/modules/recommendations/contracts/recommendation-provider.contracts.js';
export * from '@/modules/recommendations/contracts/recommendation.repository.js';
export * from '@/modules/recommendations/errors/recommendation.error.js';
export * from '@/modules/recommendations/adapters/resume-recommendation-source.loader.js';
export * from '@/modules/recommendations/contracts/recommendation-source-loader.js';
export * from '@/modules/recommendations/mappers/candidate-profile-source.mapper.js';
export * from '@/modules/recommendations/mappers/recommendation.mapper.js';
export * from '@/modules/recommendations/matching/recommendation-access.js';
export * from '@/modules/recommendations/providers/candidate-retrieval.registry.js';
export * from '@/modules/recommendations/providers/pgvector-candidate-retrieval.provider.js';
export * from '@/modules/recommendations/repositories/in-memory-recommendation.unit-of-work.js';
export * from '@/modules/recommendations/repositories/prisma-recommendation.unit-of-work.js';
export * from '@/modules/recommendations/scoring/calculators/heuristic-score.calculators.js';
export * from '@/modules/recommendations/scoring/default-match-type.classifier.js';
export * from '@/modules/recommendations/scoring/recommendation-scoring.engine.js';
export * from '@/modules/recommendations/services/recommendation-context.service.js';
export * from '@/modules/recommendations/services/recommendation-feedback.service.js';
export * from '@/modules/recommendations/services/recommendation-retrieval.service.js';
export * from '@/modules/recommendations/services/recommendation-scoring.service.js';
export * from '@/modules/recommendations/services/recommendation-source-authorization.service.js';
export * from '@/modules/recommendations/services/recommendations.service.js';
export * from '@/modules/recommendations/services/similar-jobs.service.js';
export * from '@/modules/recommendations/strategies/recommendation-source.strategy.js';
export * from '@/modules/recommendations/strategies/recommendation-strategy.resolver.js';
export * from '@/modules/recommendations/swagger/index.js';
export * from '@/modules/recommendations/utils/apply-recommendation-filters.js';
export * from '@/modules/recommendations/utils/candidate-job-filters.js';
export * from '@/modules/recommendations/utils/recommendation-query-text.js';
export * from '@/modules/recommendations/validations/recommendation.schema.js';
