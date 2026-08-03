/**
 * Formats recommendation displayScore (0-100) or fallback overallScore (0-1)
 * for UI badges.
 * See `docs/SCORE_SCALE.md`.
 */
export interface RecommendationScoreInput {
  displayScore?: number | null;
  overallScore?: number | null;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export function formatRecommendationScorePercent(
  input: RecommendationScoreInput | number | null | undefined,
): number | null {
  if (typeof input === 'object' && input !== null) {
    if (isFiniteNumber(input.displayScore)) {
      if (input.displayScore < 0 || input.displayScore > 100) return null;
      return Math.round(input.displayScore);
    }
    return formatRecommendationScorePercent(input.overallScore);
  }

  const overallScore = input;
  if (typeof overallScore !== 'number' || Number.isNaN(overallScore)) return null;
  if (overallScore < 0 || overallScore > 1) return null;
  return Math.round(overallScore * 100);
}
