import type {
  RecommendationCategory,
  RecommendationMatchType,
} from '@/modules/recommendations/types/recommendations.types.js';
import {
  HEURISTIC_SCORE_BLEND_WEIGHT,
  RETRIEVAL_SCORE_BLEND_WEIGHT,
} from '@/modules/recommendations/constants/recommendation.constants.js';

/** User-facing label explaining hybrid scoring semantics (JR-RANK-002). */
export const formatHybridScoreExplanation = (
  heuristicScore: number,
  retrievalScore?: number,
): string => {
  const retrievalPct = Math.round(RETRIEVAL_SCORE_BLEND_WEIGHT * 100);
  const heuristicPct = Math.round(HEURISTIC_SCORE_BLEND_WEIGHT * 100);
  const retrievalPart =
    retrievalScore !== undefined
      ? `semantic fit ${Math.round(retrievalScore * 100)}% (${retrievalPct}% weight)`
      : `semantic fit unavailable (${retrievalPct}% weight treated as 0)`;
  const heuristicPart = `profile fit ${Math.round(heuristicScore * 100)}% (${heuristicPct}% weight)`;
  return `Hybrid match: ${retrievalPart} + ${heuristicPart}.`;
};

export const formatRecommendationCategoryLabel = (category: RecommendationCategory): string => {
  switch (category) {
    case 'BEST_MATCH':
      return 'Best match';
    case 'GOOD_MATCH':
      return 'Good match';
    case 'STRETCH_OPPORTUNITY':
      return 'Stretch opportunity';
    case 'RELATED_CAREER_PATH':
      return 'Related path';
    default:
      return 'Match';
  }
};

export const formatRecommendationMatchTypeLabel = (matchType: RecommendationMatchType): string => {
  switch (matchType) {
    case 'EXACT':
      return 'Strong skill alignment';
    case 'ALIAS':
      return 'Similar role fit';
    case 'RELATED':
      return 'Related skills';
    case 'TRANSFERABLE':
      return 'Transferable experience';
    case 'MISSING':
      return 'Exploratory match';
    default:
      return 'Match';
  }
};

export const formatRecommendationCardSubtitle = (
  category: RecommendationCategory,
  matchType: RecommendationMatchType,
): string =>
  `${formatRecommendationCategoryLabel(category)} · ${formatRecommendationMatchTypeLabel(matchType)}`;
