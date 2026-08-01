import { describe, expect, it, vi } from 'vitest';
import {
  recommendationQueryEmbeddingCacheKey,
  resolveQueryEmbedding,
} from '@/modules/recommendations/cache/recommendation-query-embedding.cache.js';
import { cacheService } from '@/infrastructure/cache/index.js';

describe('recommendation query embedding cache', () => {
  it('builds stable user-scoped cache keys from query text hash', () => {
    const keyA = recommendationQueryEmbeddingCacheKey('u1', 'google', 'text-embedding-004', 'hello');
    const keyB = recommendationQueryEmbeddingCacheKey('u1', 'google', 'text-embedding-004', 'hello');
    const keyC = recommendationQueryEmbeddingCacheKey('u2', 'google', 'text-embedding-004', 'hello');
    expect(keyA).toBe(keyB);
    expect(keyA).not.toBe(keyC);
  });

  it('returns cached embedding on second resolve', async () => {
    const generate = vi.fn().mockResolvedValue([0.1, 0.2]);
    const first = await resolveQueryEmbedding({
      userId: 'user-1',
      provider: 'google',
      model: 'text-embedding-004',
      queryText: 'backend engineer typescript',
      generate,
    });
    const second = await resolveQueryEmbedding({
      userId: 'user-1',
      provider: 'google',
      model: 'text-embedding-004',
      queryText: 'backend engineer typescript',
      generate,
    });
    expect(first.cacheHit).toBe(false);
    expect(second.cacheHit).toBe(true);
    expect(generate).toHaveBeenCalledTimes(1);
    await cacheService.deleteByPrefix('careercopilot:recommendations:query-embedding:user-1:');
  });
});
