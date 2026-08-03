import { describe, expect, it } from 'vitest';

import { formatRecommendationScorePercent } from './formatRecommendationScore';

describe('formatRecommendationScorePercent', () => {
  it('maps unit-interval scores to percents', () => {
    expect(formatRecommendationScorePercent(0)).toBe(0);
    expect(formatRecommendationScorePercent(0.5)).toBe(50);
    expect(formatRecommendationScorePercent(0.874)).toBe(87);
    expect(formatRecommendationScorePercent(1)).toBe(100);
  });

  it('prefers displayScore without multiplying it again', () => {
    expect(formatRecommendationScorePercent({ displayScore: 87, overallScore: 0.12 })).toBe(87);
    expect(formatRecommendationScorePercent({ displayScore: 99.5, overallScore: 0.12 })).toBe(
      100,
    );
  });

  it('falls back to overallScore when displayScore is absent', () => {
    expect(formatRecommendationScorePercent({ overallScore: 0.874 })).toBe(87);
  });

  it('rejects out-of-range or invalid values', () => {
    expect(formatRecommendationScorePercent(null)).toBeNull();
    expect(formatRecommendationScorePercent(undefined)).toBeNull();
    expect(formatRecommendationScorePercent(1.2)).toBeNull();
    expect(formatRecommendationScorePercent(-0.1)).toBeNull();
    expect(formatRecommendationScorePercent(Number.NaN)).toBeNull();
    expect(formatRecommendationScorePercent({ displayScore: 101, overallScore: 0.5 })).toBeNull();
    expect(formatRecommendationScorePercent({ displayScore: -1, overallScore: 0.5 })).toBeNull();
  });
});
