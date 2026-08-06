import { describe, expect, it } from 'vitest';

import {
  formatRecommendationCardSubtitle,
  formatRecommendationCategoryLabel,
  formatRecommendationMatchTypeLabel,
} from './formatRecommendationMatchLabel';

describe('formatRecommendationCategoryLabel', () => {
  it('maps every category to its label', () => {
    expect(formatRecommendationCategoryLabel('BEST_MATCH')).toBe('Best match');
    expect(formatRecommendationCategoryLabel('GOOD_MATCH')).toBe('Good match');
    expect(formatRecommendationCategoryLabel('STRETCH_OPPORTUNITY')).toBe('Stretch opportunity');
    expect(formatRecommendationCategoryLabel('RELATED_CAREER_PATH')).toBe('Related path');
    expect(formatRecommendationCategoryLabel('UNKNOWN')).toBe('Match');
  });
});

describe('formatRecommendationMatchTypeLabel', () => {
  it('maps every match type to its label', () => {
    expect(formatRecommendationMatchTypeLabel('EXACT')).toBe('Strong skill alignment');
    expect(formatRecommendationMatchTypeLabel('ALIAS')).toBe('Similar role fit');
    expect(formatRecommendationMatchTypeLabel('RELATED')).toBe('Related skills');
    expect(formatRecommendationMatchTypeLabel('TRANSFERABLE')).toBe('Transferable experience');
    expect(formatRecommendationMatchTypeLabel('MISSING')).toBe('Exploratory match');
    expect(formatRecommendationMatchTypeLabel('OTHER')).toBe('Match');
  });
});

describe('formatRecommendationCardSubtitle', () => {
  it('combines the category and match type labels', () => {
    expect(formatRecommendationCardSubtitle('BEST_MATCH', 'EXACT')).toBe(
      'Best match · Strong skill alignment',
    );
    expect(formatRecommendationCardSubtitle('GOOD_MATCH', 'ALIAS')).toBe(
      'Good match · Similar role fit',
    );
  });
});
