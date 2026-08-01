import {
  RECOMMENDATION_ERROR_CODES,
  RecommendationError,
} from '@/modules/recommendations/errors/recommendation.error.js';

export interface UserOwnedRecommendationResource {
  userId: string;
}

export const assertRecommendationOwnership = (
  userId: string,
  resource: UserOwnedRecommendationResource,
): void => {
  if (resource.userId !== userId) {
    throw new RecommendationError(
      'Recommendation resource is not owned by the authenticated user',
      403,
      RECOMMENDATION_ERROR_CODES.ACCESS_DENIED,
    );
  }
};
