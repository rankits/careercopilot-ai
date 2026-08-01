/**
 * Formats recommendation overallScore (0–1) for UI badges.
 * See `docs/SCORE_SCALE.md`.
 */
export function formatRecommendationScorePercent(
  overallScore: number | null | undefined,
): number | null {
  if (typeof overallScore !== 'number' || Number.isNaN(overallScore)) return null;
  if (overallScore < 0 || overallScore > 1) return null;
  return Math.round(overallScore * 100);
}
