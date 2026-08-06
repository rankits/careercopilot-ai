import type { RecommendationDto } from '@/features/recommendations/types/recommendation.types';

export const careerCategoryOrder = [
  'BEST_MATCH',
  'GOOD_MATCH',
  'STRETCH_OPPORTUNITY',
  'RELATED_CAREER_PATH',
];

export const careerCategoryCopy: Record<string, string> = {
  BEST_MATCH: 'Target-role matches',
  GOOD_MATCH: 'Transitional matches',
  STRETCH_OPPORTUNITY: 'Stretch matches',
  RELATED_CAREER_PATH: 'Current and adjacent paths',
};

export const groupCareerRecommendations = (items: readonly RecommendationDto[]) => {
  const byCategory = new Map<string, RecommendationDto[]>();
  for (const item of items) {
    const category = item.category || 'RELATED_CAREER_PATH';
    byCategory.set(category, [...(byCategory.get(category) ?? []), item]);
  }
  return [
    ...careerCategoryOrder.map((category) => [category, byCategory.get(category) ?? []] as const),
    ...[...byCategory.entries()].filter(([category]) => !careerCategoryOrder.includes(category)),
  ].filter(([, categoryItems]) => categoryItems.length > 0);
};
