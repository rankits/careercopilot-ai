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
import { CandidateRetrievalRegistry } from '@/modules/recommendations/providers/candidate-retrieval.registry.js';
import { PgVectorCandidateRetrievalProvider } from '@/modules/recommendations/providers/pgvector-candidate-retrieval.provider.js';
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
export const recommendationsService = new RecommendationsService(recommendationsLogger);
export const recommendationsRoutes = createRecommendationsRouter(recommendationsService);

export * from '@/modules/recommendations/types/recommendations.types.js';
export * from '@/modules/recommendations/constants/recommendation.constants.js';
export * from '@/modules/recommendations/contracts/recommendation-provider.contracts.js';
export * from '@/modules/recommendations/contracts/recommendation.repository.js';
export * from '@/modules/recommendations/errors/recommendation.error.js';
export * from '@/modules/recommendations/mappers/recommendation.mapper.js';
export * from '@/modules/recommendations/matching/recommendation-access.js';
export * from '@/modules/recommendations/providers/candidate-retrieval.registry.js';
export * from '@/modules/recommendations/providers/pgvector-candidate-retrieval.provider.js';
export * from '@/modules/recommendations/scoring/recommendation-scoring.engine.js';
export * from '@/modules/recommendations/services/recommendation-context.service.js';
export * from '@/modules/recommendations/services/recommendation-explanation.service.js';
export * from '@/modules/recommendations/services/recommendation-feedback.service.js';
export * from '@/modules/recommendations/services/recommendation-retrieval.service.js';
export * from '@/modules/recommendations/services/recommendation-scoring.service.js';
export * from '@/modules/recommendations/services/recommendations.service.js';
export * from '@/modules/recommendations/services/similar-jobs.service.js';
export * from '@/modules/recommendations/strategies/recommendation-source.strategy.js';
export * from '@/modules/recommendations/strategies/recommendation-strategy.resolver.js';
export * from '@/modules/recommendations/utils/recommendation-query-text.js';
export * from '@/modules/recommendations/validations/recommendation.schema.js';
