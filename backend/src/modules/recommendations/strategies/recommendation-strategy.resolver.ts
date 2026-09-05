import {
  RECOMMENDATION_ERROR_CODES,
  RecommendationError,
} from '@/modules/recommendations/errors/recommendation.error.js';
import type { RecommendationSourceType } from '@/modules/recommendations/types/recommendations.types.js';
import type { RecommendationSourceStrategy } from '@/modules/recommendations/strategies/recommendation-source.strategy.js';

export class RecommendationStrategyResolver {
  constructor(private readonly strategies: readonly RecommendationSourceStrategy[]) {}

  resolve(sourceType?: RecommendationSourceType): RecommendationSourceStrategy {
    if (!sourceType) {
      throw new RecommendationError(
        'A recommendation source type is required',
        400,
        RECOMMENDATION_ERROR_CODES.SOURCE_NOT_FOUND,
      );
    }
    const strategy = this.strategies.find((candidate) => candidate.supports(sourceType));
    if (!strategy) {
      throw new RecommendationError(
        `Recommendation source type ${sourceType} is not configured`,
        400,
        RECOMMENDATION_ERROR_CODES.SOURCE_NOT_SUPPORTED,
      );
    }
    return strategy;
  }
}
