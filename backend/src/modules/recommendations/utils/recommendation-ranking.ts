import type {
  RecommendationMatchType,
  ScoredJobRecommendation,
} from '@/modules/recommendations/types/recommendations.types.js';

const MATCH_TYPE_QUALITY: Record<RecommendationMatchType, number> = {
  EXACT: 0,
  ALIAS: 1,
  RELATED: 2,
  TRANSFERABLE: 3,
  MISSING: 4,
};

export const compareRecommendationRank = (
  left: ScoredJobRecommendation,
  right: ScoredJobRecommendation,
): number =>
  right.scoreResult.overallScore - left.scoreResult.overallScore ||
  MATCH_TYPE_QUALITY[left.matchType] - MATCH_TYPE_QUALITY[right.matchType] ||
  left.job.id.localeCompare(right.job.id);

export const sortRecommendationsForRanking = <T extends ScoredJobRecommendation>(
  recommendations: readonly T[],
): T[] => [...recommendations].sort(compareRecommendationRank);
