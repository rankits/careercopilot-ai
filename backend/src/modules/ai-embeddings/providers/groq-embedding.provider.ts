import type { EmbeddingPurpose } from '@/modules/ai-embeddings/contracts/embedding-provider.js';
import {
  BaseEmbeddingProvider,
  type BaseEmbeddingProviderOptions,
} from '@/modules/ai-embeddings/providers/base-embedding.provider.js';
import {
  FetchEmbeddingHttpClient,
  type EmbeddingHttpClient,
} from '@/modules/ai-embeddings/providers/embedding-http.client.js';
import { fingerprintCircuitBreakerScope } from '@/modules/ai-embeddings/utils/embedding-circuit-breaker.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

interface GroqEmbeddingResponse {
  data?: Array<{
    index?: number;
    embedding?: number[] | string;
  }>;
}

export interface GroqEmbeddingProviderOptions extends BaseEmbeddingProviderOptions {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly timeoutMs: number;
}

export class GroqEmbeddingProvider extends BaseEmbeddingProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly http: EmbeddingHttpClient;

  constructor(
    options: GroqEmbeddingProviderOptions,
    http: EmbeddingHttpClient = new FetchEmbeddingHttpClient(),
  ) {
    super({
      ...options,
      breakerScope: fingerprintCircuitBreakerScope(options.provider, options.apiKey),
    });
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs;
    this.http = http;
  }

  protected async requestBatch(
    texts: readonly string[],
    _purpose: EmbeddingPurpose,
  ): Promise<number[][]> {
    const response = await this.http.post<GroqEmbeddingResponse>(
      `${this.baseUrl}/embeddings`,
      {
        input: texts,
        model: this.model,
        encoding_format: 'float',
      },
      { authorization: `Bearer ${this.apiKey}` },
      this.timeoutMs,
    );
    if (!Array.isArray(response.data)) {
      throw new AppError('Groq embedding response omitted data', 502, 'INVALID_EMBEDDING_RESPONSE');
    }
    return [...response.data]
      .sort((left, right) => (left.index ?? 0) - (right.index ?? 0))
      .map((item) => (Array.isArray(item.embedding) ? item.embedding : []));
  }
}
