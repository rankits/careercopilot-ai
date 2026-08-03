import { describe, expect, it } from 'vitest';
import { resolveRecommendationRetrievalSearchLimit } from '@/modules/recommendations/utils/recommendation-retrieval-budget.js';

describe('recommendation retrieval budget (JRE-PERF-001)', () => {
  it('over-fetches with a bounded multiplier for hydrated post-filters', () => {
    expect(
      resolveRecommendationRetrievalSearchLimit(20, {
        overfetchMultiplier: 4,
        maxSearchLimit: 200,
      }),
    ).toBe(80);
    expect(
      resolveRecommendationRetrievalSearchLimit(100, {
        overfetchMultiplier: 4,
        maxSearchLimit: 200,
      }),
    ).toBe(200);
  });
});

