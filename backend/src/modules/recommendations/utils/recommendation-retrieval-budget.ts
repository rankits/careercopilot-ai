const DEFAULT_OVERFETCH_MULTIPLIER = 4;
const DEFAULT_MAX_SEARCH_LIMIT = 200;

const positiveIntegerOrDefault = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const recommendationRetrievalBudget = {
  overfetchMultiplier: positiveIntegerOrDefault(
    process.env.RECOMMENDATION_RETRIEVAL_OVERFETCH_MULTIPLIER,
    DEFAULT_OVERFETCH_MULTIPLIER,
  ),
  maxSearchLimit: positiveIntegerOrDefault(
    process.env.RECOMMENDATION_RETRIEVAL_MAX_SEARCH_LIMIT,
    DEFAULT_MAX_SEARCH_LIMIT,
  ),
};

export const resolveRecommendationRetrievalSearchLimit = (
  requestedLimit: number,
  budget = recommendationRetrievalBudget,
): number => {
  const limit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? requestedLimit : 1;
  return Math.min(limit * budget.overfetchMultiplier, budget.maxSearchLimit);
};

