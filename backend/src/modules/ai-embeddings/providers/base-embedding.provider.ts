import type {
  EmbeddingProvider,
  EmbeddingPurpose,
} from '@/modules/ai-embeddings/contracts/embedding-provider.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

export interface BaseEmbeddingProviderOptions {
  readonly provider: string;
  readonly model: string;
  readonly dimensions: number;
  readonly batchSize: number;
  readonly documentPrefix: string;
  readonly queryPrefix: string;
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

  constructor(options: BaseEmbeddingProviderOptions) {
    this.provider = options.provider;
    this.model = options.model;
    this.dimensions = options.dimensions;
    this.batchSize = options.batchSize;
    this.documentPrefix = options.documentPrefix;
    this.queryPrefix = options.queryPrefix;
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
      const vectors = await this.requestBatch(batch, purpose);
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

  protected abstract requestBatch(
    texts: readonly string[],
    purpose: EmbeddingPurpose,
  ): Promise<number[][]>;
}
