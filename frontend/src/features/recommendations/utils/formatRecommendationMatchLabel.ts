/** FE labels aligned with backend hybrid scoring categories (JR-RANK-002). */

export const formatRecommendationCategoryLabel = (category: string): string => {
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

export const formatRecommendationMatchTypeLabel = (matchType: string): string => {
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

export const formatRecommendationCardSubtitle = (category: string, matchType: string): string =>
  `${formatRecommendationCategoryLabel(category)} · ${formatRecommendationMatchTypeLabel(matchType)}`;
