import { beforeEach, describe, expect, it } from 'vitest';
import type { ICacheService } from '@/infrastructure/cache/cache.interface.js';
import {
  EmbeddingProviderCircuitBreaker,
  fingerprintCircuitBreakerScope,
} from '@/modules/ai-embeddings/utils/embedding-circuit-breaker.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

class FakeCacheService implements ICacheService {
  private store = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | null> {
    return (this.store.has(key) ? (this.store.get(key) as T) : null) ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async deleteByPrefix(): Promise<number> {
    return 0;
  }

  async exists(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async increment(): Promise<number> {
    return 1;
  }

  async ping(): Promise<boolean> {
    return true;
  }

  async disconnect(): Promise<void> {
    this.store.clear();
  }

  async getOrSet<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await fetcher();
    await this.set(key, value);
    return value;
  }

  async tryAcquireLock(): Promise<boolean> {
    return true;
  }

  async releaseLock(): Promise<void> {
    // no-op
  }
}

describe('EmbeddingProviderCircuitBreaker', () => {
  let cache: FakeCacheService;
  let breaker: EmbeddingProviderCircuitBreaker;

  beforeEach(() => {
    cache = new FakeCacheService();
    breaker = new EmbeddingProviderCircuitBreaker(cache, 900);
  });

  it('reports closed when no failure has been recorded', async () => {
    const state = await breaker.getState('openrouter');
    expect(state.open).toBe(false);
    await expect(breaker.assertClosed('openrouter')).resolves.toBeUndefined();
  });

  it('does not open for retryable / unrelated errors', async () => {
    const rateLimited = new AppError('Rate limited', 429, 'OPENROUTER_EMBEDDING_RATE_LIMITED');
    const opened = await breaker.tripOnError('openrouter', rateLimited);
    expect(opened).toBe(false);
    expect((await breaker.getState('openrouter')).open).toBe(false);
  });

  it('does not open for non-AppError failures (e.g. plain network errors)', async () => {
    const opened = await breaker.tripOnError('openrouter', new Error('ECONNRESET'));
    expect(opened).toBe(false);
  });

  it('opens on HTTP 402 (insufficient credits) and blocks subsequent calls without hitting the API', async () => {
    const creditsError = new AppError(
      'Insufficient credits. This account never purchased credits.',
      402,
      'OPENROUTER_EMBEDDING_INSUFFICIENT_CREDITS',
    );

    const opened = await breaker.tripOnError('openrouter', creditsError);
    expect(opened).toBe(true);

    const state = await breaker.getState('openrouter');
    expect(state).toMatchObject({
      open: true,
      reason: creditsError.message,
      code: 'OPENROUTER_EMBEDDING_INSUFFICIENT_CREDITS',
    });
    expect(state.openedAt).toBeDefined();

    await expect(breaker.assertClosed('openrouter')).rejects.toMatchObject({
      code: 'EMBEDDING_PROVIDER_CIRCUIT_OPEN',
      statusCode: 503,
    });
  });

  it('scopes breaker state per provider', async () => {
    const creditsError = new AppError('Insufficient credits.', 402, 'OPENROUTER_EMBEDDING_INSUFFICIENT_CREDITS');
    await breaker.tripOnError('openrouter', creditsError);

    await expect(breaker.assertClosed('openrouter')).rejects.toBeDefined();
    await expect(breaker.assertClosed('google')).resolves.toBeUndefined();
  });

  it('closes manually, allowing calls to resume', async () => {
    const creditsError = new AppError('Insufficient credits.', 402, 'OPENROUTER_EMBEDDING_INSUFFICIENT_CREDITS');
    await breaker.tripOnError('openrouter', creditsError);
    await expect(breaker.assertClosed('openrouter')).rejects.toBeDefined();

    await breaker.close('openrouter');

    await expect(breaker.assertClosed('openrouter')).resolves.toBeUndefined();
    expect((await breaker.getState('openrouter')).open).toBe(false);
  });
});

describe('fingerprintCircuitBreakerScope', () => {
  it('falls back to the bare provider name when no API key is configured', () => {
    expect(fingerprintCircuitBreakerScope('openrouter', undefined)).toBe('openrouter');
  });

  it('is deterministic for the same provider + API key', () => {
    const a = fingerprintCircuitBreakerScope('openrouter', 'sk-shared-key');
    const b = fingerprintCircuitBreakerScope('openrouter', 'sk-shared-key');
    expect(a).toBe(b);
    expect(a.startsWith('openrouter:')).toBe(true);
  });

  it('never embeds the raw API key in the scope', () => {
    const scope = fingerprintCircuitBreakerScope('openrouter', 'sk-super-secret-value');
    expect(scope).not.toContain('sk-super-secret-value');
  });

  it('scopes different API keys (e.g. shared vs. recommendation) to different breakers', async () => {
    const breaker = new EmbeddingProviderCircuitBreaker(new FakeCacheService(), 900);
    const sharedScope = fingerprintCircuitBreakerScope('openrouter', 'sk-shared-key');
    const recommendationScope = fingerprintCircuitBreakerScope('openrouter', 'sk-recommendation-key');
    expect(sharedScope).not.toBe(recommendationScope);

    const creditsError = new AppError('Insufficient credits.', 402, 'OPENROUTER_EMBEDDING_INSUFFICIENT_CREDITS');
    await breaker.tripOnError(sharedScope, creditsError);

    // Tripping the shared-key breaker must not affect a differently-keyed config.
    await expect(breaker.assertClosed(sharedScope)).rejects.toBeDefined();
    await expect(breaker.assertClosed(recommendationScope)).resolves.toBeUndefined();
  });

  it('shares breaker state when two configs use the identical API key', async () => {
    const breaker = new EmbeddingProviderCircuitBreaker(new FakeCacheService(), 900);
    const scopeA = fingerprintCircuitBreakerScope('openrouter', 'sk-identical-key');
    const scopeB = fingerprintCircuitBreakerScope('openrouter', 'sk-identical-key');

    const creditsError = new AppError('Insufficient credits.', 402, 'OPENROUTER_EMBEDDING_INSUFFICIENT_CREDITS');
    await breaker.tripOnError(scopeA, creditsError);

    await expect(breaker.assertClosed(scopeB)).rejects.toBeDefined();
  });
});
