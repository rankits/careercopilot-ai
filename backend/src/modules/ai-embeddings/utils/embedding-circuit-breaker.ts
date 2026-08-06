import { createHash } from 'node:crypto';
import { CacheKeys, cacheService, type ICacheService } from '@/infrastructure/cache/index.js';
import { embeddingConfig } from '@/modules/ai-embeddings/config/embedding.config.js';
import { logger } from '@/shared/logger/logger.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

/**
 * Scopes a circuit breaker to `${provider}:${fingerprint(apiKey)}` so two
 * configs for the same provider name (e.g. shared vs. recommendation
 * OpenRouter credentials) only share breaker state when they are, in fact,
 * the same credential/credits pool. The key itself is never persisted or
 * logged — only a short, non-reversible hash of it.
 */
export const fingerprintCircuitBreakerScope = (provider: string, apiKey: string | undefined): string => {
  if (!apiKey) return provider;
  const fingerprint = createHash('sha256').update(apiKey).digest('hex').slice(0, 12);
  return `${provider}:${fingerprint}`;
};

/**
 * Errors that mean "this provider cannot serve requests until a human
 * intervenes" (bad/expired API key, out of credits, etc). Retrying these
 * immediately is pointless and just burns more of the provider's quota /
 * rate limit, so they trip the circuit breaker instead of being retried.
 */
const CIRCUIT_OPENING_CODES = new Set<string>(['OPENROUTER_EMBEDDING_INSUFFICIENT_CREDITS']);

const isCircuitOpeningError = (err: unknown): err is AppError =>
  err instanceof AppError &&
  (err.statusCode === 402 || (typeof err.code === 'string' && CIRCUIT_OPENING_CODES.has(err.code)));

interface CircuitBreakerRecord {
  readonly reason: string;
  readonly code?: string;
  readonly openedAt: string;
}

export interface CircuitBreakerState {
  readonly open: boolean;
  readonly reason?: string;
  readonly code?: string;
  readonly openedAt?: string;
}

/**
 * Redis-backed (falls back to in-memory in tests/dev) circuit breaker for
 * embedding providers. When a provider reports a permanent failure (e.g.
 * OpenRouter "insufficient credits", HTTP 402), the breaker "opens": the
 * failure is cached with a TTL, and every subsequent call short-circuits
 * without hitting the network until the TTL expires (the breaker "closes"
 * again automatically) or it is cleared manually.
 */
export class EmbeddingProviderCircuitBreaker {
  constructor(
    private readonly cache: ICacheService,
    private readonly ttlSeconds: number,
  ) {}

  private key(provider: string): string {
    return CacheKeys.AI_EMBEDDINGS.CIRCUIT_BREAKER(provider);
  }

  async getState(provider: string): Promise<CircuitBreakerState> {
    const record = await this.cache.get<CircuitBreakerRecord>(this.key(provider));
    if (!record) return { open: false };
    return { open: true, reason: record.reason, code: record.code, openedAt: record.openedAt };
  }

  async open(provider: string, error: AppError): Promise<void> {
    const record: CircuitBreakerRecord = {
      reason: error.message,
      code: error.code,
      openedAt: new Date().toISOString(),
    };
    await this.cache.set(this.key(provider), record, this.ttlSeconds);
    logger.error(
      { provider, code: error.code, statusCode: error.statusCode, ttlSeconds: this.ttlSeconds },
      'Embedding provider circuit breaker opened; API calls to this provider will be skipped until it closes',
    );
  }

  async close(provider: string): Promise<void> {
    await this.cache.delete(this.key(provider));
    logger.info({ provider }, 'Embedding provider circuit breaker closed');
  }

  /**
   * Opens the breaker if `err` is a permanent (non-retryable) failure such
   * as "insufficient credits". Returns true when the breaker was opened.
   */
  async tripOnError(provider: string, err: unknown): Promise<boolean> {
    if (!isCircuitOpeningError(err)) return false;
    await this.open(provider, err);
    return true;
  }

  /**
   * Throws a fast, network-free AppError if the breaker is open for
   * `provider`; otherwise resolves normally.
   */
  async assertClosed(provider: string): Promise<void> {
    const state = await this.getState(provider);
    if (!state.open) return;

    logger.error(
      { provider, reason: state.reason, code: state.code, openedAt: state.openedAt },
      'Skipping embedding API call: circuit breaker is open for this provider',
    );

    throw new AppError(
      `Embedding provider "${provider}" is temporarily disabled (circuit open): ${state.reason}`,
      503,
      'EMBEDDING_PROVIDER_CIRCUIT_OPEN',
      { provider, reason: state.reason, code: state.code, openedAt: state.openedAt },
    );
  }
}

export const embeddingProviderCircuitBreaker = new EmbeddingProviderCircuitBreaker(
  cacheService,
  embeddingConfig.circuitBreakerTtlSeconds,
);
