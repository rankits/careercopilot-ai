import { describe, expect, it } from 'vitest';

import { formatRecommendationScorePercent } from './formatRecommendationScore';

describe('formatRecommendationScorePercent', () => {
  it('maps unit-interval scores to percents', () => {
    expect(formatRecommendationScorePercent(0)).toBe(0);
    expect(formatRecommendationScorePercent(0.5)).toBe(50);
    expect(formatRecommendationScorePercent(0.874)).toBe(87);
    expect(formatRecommendationScorePercent(1)).toBe(100);
  });

  it('rejects out-of-range or invalid values', () => {
    expect(formatRecommendationScorePercent(null)).toBeNull();
    expect(formatRecommendationScorePercent(undefined)).toBeNull();
    expect(formatRecommendationScorePercent(1.2)).toBeNull();
    expect(formatRecommendationScorePercent(-0.1)).toBeNull();
    expect(formatRecommendationScorePercent(Number.NaN)).toBeNull();
  });
});
