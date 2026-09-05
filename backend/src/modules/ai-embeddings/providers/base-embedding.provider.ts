import type {
  EmbeddingProvider,
  EmbeddingPurpose,
} from '@/modules/ai-embeddings/contracts/embedding-provider.js';
import { embeddingProviderCircuitBreaker } from '@/modules/ai-embeddings/utils/embedding-circuit-breaker.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

export interface BaseEmbeddingProviderOptions {
  readonly provider: string;
  readonly model: string;
  readonly dimensions: number;
  readonly batchSize: number;
  readonly documentPrefix: string;
  readonly queryPrefix: string;
  /**
   * Circuit breaker cache key, defaults to `provider`. Pass a value scoped to
   * the credential in use (e.g. via `fingerprintCircuitBreakerScope`) so two
   * configs for the same provider (e.g. a separate recommendation API key)
   * don't share breaker state unless they share the same credential.
   */
  readonly breakerScope?: string;
}

const normalizeVector = (vector: readonly number[], dimensions: number): number[] => {
  if (vector.length !== dimensions || vector.some((value) => !Number.isFinite(value))) {
    throw new AppError(
      `Embedding provider returned an invalid ${vector.length}-dimension vector`,
      502,
      'INVALID_EMBEDDING_RESPONSE',
    );
  }
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!Number.isFinite(magnitude) || magnitude === 0) {
    throw new AppError(
      'Embedding provider returned a zero vector',
      502,
      'INVALID_EMBEDDING_RESPONSE',
    );
  }
  return vector.map((value) => value / magnitude);
};

export abstract class BaseEmbeddingProvider implements EmbeddingProvider {
  readonly provider: string;
  readonly model: string;
  readonly dimensions: number;
  private readonly batchSize: number;
  private readonly documentPrefix: string;
  private readonly queryPrefix: string;
  private readonly circuitBreakerScope: string;

  constructor(options: BaseEmbeddingProviderOptions) {
    this.provider = options.provider;
    this.model = options.model;
    this.dimensions = options.dimensions;
    this.batchSize = options.batchSize;
    this.documentPrefix = options.documentPrefix;
    this.queryPrefix = options.queryPrefix;
    this.circuitBreakerScope = options.breakerScope ?? options.provider;
  }

  async generateEmbedding(text: string, purpose: EmbeddingPurpose = 'QUERY'): Promise<number[]> {
    const [embedding] = await this.generateEmbeddings([text], purpose);
    return embedding;
  }

  async generateEmbeddings(
    texts: readonly string[],
    purpose: EmbeddingPurpose = 'QUERY',
  ): Promise<number[][]> {
    if (texts.length === 0) return [];
    const prepared = texts.map((text) => {
      const normalized = text.trim();
      if (!normalized) {
        throw new AppError('Embedding input cannot be empty', 422, 'INVALID_EMBEDDING_INPUT');
      }
      const prefix = purpose === 'DOCUMENT' ? this.documentPrefix : this.queryPrefix;
      return `${prefix}${normalized}`;
    });

    const results: number[][] = [];
    for (let offset = 0; offset < prepared.length; offset += this.batchSize) {
      const batch = prepared.slice(offset, offset + this.batchSize);
      const vectors = await this.requestBatchGuarded(batch, purpose);
      if (vectors.length !== batch.length) {
        throw new AppError(
          'Embedding provider returned an unexpected result count',
          502,
          'INVALID_EMBEDDING_RESPONSE',
        );
      }
      results.push(...vectors.map((vector) => normalizeVector(vector, this.dimensions)));
    }
    return results;
  }

  async embedDocument(text: string): Promise<number[]> {
    return this.generateEmbedding(text, 'DOCUMENT');
  }

  async embedQuery(text: string): Promise<number[]> {
    return this.generateEmbedding(text, 'QUERY');
  }

  async embedDocuments(texts: readonly string[]): Promise<number[][]> {
    return this.generateEmbeddings(texts, 'DOCUMENT');
  }

  async embedQueries(texts: readonly string[]): Promise<number[][]> {
    return this.generateEmbeddings(texts, 'QUERY');
  }

  /**
   * Wraps `requestBatch` with the provider's circuit breaker: skips the API
   * call entirely (no network request) while the breaker is open, and trips
   * it when a permanent failure (e.g. "insufficient credits") is seen.
   */
  private async requestBatchGuarded(
    texts: readonly string[],
    purpose: EmbeddingPurpose,
  ): Promise<number[][]> {
    await embeddingProviderCircuitBreaker.assertClosed(this.circuitBreakerScope);
    try {
      return await this.requestBatch(texts, purpose);
    } catch (err: unknown) {
      await embeddingProviderCircuitBreaker.tripOnError(this.circuitBreakerScope, err);
      throw err;
    }
  }

  protected abstract requestBatch(
    texts: readonly string[],
    purpose: EmbeddingPurpose,
  ): Promise<number[][]>;
}
