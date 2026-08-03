import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createRecommendationLifecycleService } from '@/modules/recommendations/services/recommendation-lifecycle.service.js';
import {
  recommendationMetricsSnapshot,
  resetRecommendationMetricsForTests,
} from '@/modules/recommendations/observability/recommendation.metrics.js';

describe('Recommendation lifecycle invalidation (JRE-LIFE-001)', () => {
  beforeEach(() => resetRecommendationMetricsForTests());

  it('clears query embeddings, invalidates candidate embeddings, and records the invalidation metric', async () => {
    const invalidateUserQueryEmbeddings = vi.fn().mockResolvedValue(undefined);
    const candidateEmbeddings = {
      invalidateUserSource: vi.fn().mockResolvedValue(2),
    };
    const service = createRecommendationLifecycleService({
      invalidateUserQueryEmbeddings,
      candidateEmbeddings,
    });

    await service.invalidateUserRecommendationState({
      userId: 'user-1',
      sourceType: 'RESUME',
      sourceId: 'resume-1',
    });

    expect(invalidateUserQueryEmbeddings).toHaveBeenCalledWith('user-1');
    expect(candidateEmbeddings.invalidateUserSource).toHaveBeenCalledWith({
      userId: 'user-1',
      sourceType: 'RESUME',
      sourceId: 'resume-1',
    });
    expect(recommendationMetricsSnapshot().recommendationInvalidationTotal).toBe(1);
  });
});

