import type { EmbeddingPurpose } from '@/modules/ai-embeddings/contracts/embedding-provider.js';
import {
  BaseEmbeddingProvider,
  type BaseEmbeddingProviderOptions,
} from '@/modules/ai-embeddings/providers/base-embedding.provider.js';
import {
  FetchEmbeddingHttpClient,
  type EmbeddingHttpClient,
} from '@/modules/ai-embeddings/providers/embedding-http.client.js';
import { logger } from '@/shared/logger/logger.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

interface LocalHttpEmbeddingResponse {
  data?: Array<{
    index?: number;
    embedding?: number[] | string;
  }>;
}

export interface LocalHttpEmbeddingProviderOptions extends BaseEmbeddingProviderOptions {
  readonly baseUrl: string;
  readonly timeoutMs: number;
}

/**
 * OpenAI-compatible client for the in-Compose embedding-service.
 * No API key — the service is private on the Docker network only.
 */
export class LocalHttpEmbeddingProvider extends BaseEmbeddingProvider {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly http: EmbeddingHttpClient;
  private readonly log = logger.child({ component: 'local-http-embedding' });

  constructor(
    options: LocalHttpEmbeddingProviderOptions,
    http: EmbeddingHttpClient = new FetchEmbeddingHttpClient(),
  ) {
    super(options);
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs;
    this.http = http;
  }

  protected async requestBatch(
    texts: readonly string[],
    purpose: EmbeddingPurpose,
  ): Promise<number[][]> {
    const startedAt = Date.now();
    this.log.info(
      { purpose, batchSize: texts.length, model: this.model, baseUrl: this.baseUrl },
      'Requesting local-http embeddings',
    );
    const response = await this.http.post<LocalHttpEmbeddingResponse>(
      `${this.baseUrl}/embeddings`,
      {
        input: texts,
        model: this.model,
        encoding_format: 'float',
      },
      { 'content-type': 'application/json' },
      this.timeoutMs,
    );
    if (!Array.isArray(response.data)) {
      throw new AppError(
        'Local embedding response omitted data',
        502,
        'INVALID_EMBEDDING_RESPONSE',
      );
    }
    const vectors = [...response.data]
      .sort((left, right) => (left.index ?? 0) - (right.index ?? 0))
      .map((item) => (Array.isArray(item.embedding) ? item.embedding : []));
    this.log.info(
      {
        purpose,
        batchSize: texts.length,
        vectorCount: vectors.length,
        dimensions: vectors[0]?.length,
        durationMs: Date.now() - startedAt,
      },
      'Local-http embeddings received',
    );
    return vectors;
  }
}
