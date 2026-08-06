import { recommendationRetrievalBudget } from '@/modules/recommendations/config/recommendation-retrieval.config.js';

export { recommendationRetrievalBudget };

export const resolveRecommendationRetrievalSearchLimit = (
  requestedLimit: number,
  budget = recommendationRetrievalBudget,
): number => {
  const limit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? requestedLimit : 1;
  return Math.min(limit * budget.overfetchMultiplier, budget.maxSearchLimit);
};
