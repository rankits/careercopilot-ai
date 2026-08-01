import { describe, expect, it, vi } from 'vitest';

import { formatRecommendationCardSubtitle } from '@/features/recommendations/utils/formatRecommendationMatchLabel';

describe('formatRecommendationMatchLabel', () => {
  it('formats hybrid-aligned category and match type labels', () => {
    expect(formatRecommendationCardSubtitle('BEST_MATCH', 'EXACT')).toBe(
      'Best match · Strong skill alignment',
    );
  });
});
