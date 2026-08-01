import {
  RECOMMENDATION_ERROR_CODES,
  RecommendationError,
} from '@/modules/recommendations/errors/recommendation.error.js';
import type {
  RecommendationContext,
  RecommendationReason,
  ScoredJobRecommendation,
} from '@/modules/recommendations/types/recommendations.types.js';

export interface RecommendationExplanationProvider {
  explain(
    context: RecommendationContext,
    recommendation: ScoredJobRecommendation,
  ): Promise<RecommendationReason[]>;
}

export class RecommendationExplanationService {
  constructor(private readonly provider?: RecommendationExplanationProvider) {}

  explain(
    context: RecommendationContext,
    recommendation: ScoredJobRecommendation,
  ): Promise<RecommendationReason[]> {
    if (!this.provider) {
      throw new RecommendationError(
        'Recommendation explanation provider is not configured',
        501,
        RECOMMENDATION_ERROR_CODES.NOT_IMPLEMENTED,
      );
    }
    return this.provider.explain(context, recommendation);
  }
}
