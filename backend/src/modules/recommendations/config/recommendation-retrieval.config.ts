const positiveIntegerOrDefault = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

/** Module-load budget knobs — avoid process.env in request hot paths. */
export const recommendationRetrievalBudget = {
  overfetchMultiplier: positiveIntegerOrDefault(
    process.env.RECOMMENDATION_RETRIEVAL_OVERFETCH_MULTIPLIER,
    4,
  ),
  maxSearchLimit: positiveIntegerOrDefault(
    process.env.RECOMMENDATION_RETRIEVAL_MAX_SEARCH_LIMIT,
    200,
  ),
};
