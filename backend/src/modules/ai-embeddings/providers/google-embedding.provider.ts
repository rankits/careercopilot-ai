import type { EmbeddingPurpose } from '@/modules/ai-embeddings/contracts/embedding-provider.js';
import {
  BaseEmbeddingProvider,
  type BaseEmbeddingProviderOptions,
} from '@/modules/ai-embeddings/providers/base-embedding.provider.js';
import {
  FetchEmbeddingHttpClient,
  type EmbeddingHttpClient,
} from '@/modules/ai-embeddings/providers/embedding-http.client.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

interface GoogleEmbeddingResponse {
  embeddings?: Array<{ values?: number[] }>;
}

export interface GoogleEmbeddingProviderOptions extends BaseEmbeddingProviderOptions {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly timeoutMs: number;
}

export class GoogleEmbeddingProvider extends BaseEmbeddingProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly http: EmbeddingHttpClient;

  constructor(
    options: GoogleEmbeddingProviderOptions,
    http: EmbeddingHttpClient = new FetchEmbeddingHttpClient(),
  ) {
    super(options);
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs;
    this.http = http;
  }

  protected async requestBatch(
    texts: readonly string[],
    purpose: EmbeddingPurpose,
  ): Promise<number[][]> {
    const modelName = this.model.replace(/^models\//, '');
    const modelPath = `models/${modelName}`;
    const response = await this.http.post<GoogleEmbeddingResponse>(
      `${this.baseUrl}/${modelPath}:batchEmbedContents`,
      {
        requests: texts.map((text) => ({
          model: modelPath,
          content: { parts: [{ text }] },
          taskType: purpose === 'DOCUMENT' ? 'RETRIEVAL_DOCUMENT' : 'RETRIEVAL_QUERY',
          outputDimensionality: this.dimensions,
        })),
      },
      { 'x-goog-api-key': this.apiKey },
      this.timeoutMs,
    );
    if (!Array.isArray(response.embeddings)) {
      throw new AppError(
        'Google embedding response omitted embeddings',
        502,
        'INVALID_EMBEDDING_RESPONSE',
      );
    }
    return response.embeddings.map((embedding) => embedding.values ?? []);
  }
}
