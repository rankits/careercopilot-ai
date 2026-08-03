import type { EmbeddingPurpose } from '@/modules/ai-embeddings/contracts/embedding-provider.js';
import {
  BaseEmbeddingProvider,
  type BaseEmbeddingProviderOptions,
} from '@/modules/ai-embeddings/providers/base-embedding.provider.js';
import type { EmbeddingHttpClient } from '@/modules/ai-embeddings/providers/embedding-http.client.js';
import {
  OpenRouterEmbeddingClient,
  type OpenRouterClientOptions,
} from '@/modules/ai-embeddings/providers/openrouter-embedding.client.js';
import {
  recordActiveEmbeddingModel,
  recordDimensionMismatch,
  recordOpenRouterRequest,
} from '@/modules/ai-embeddings/observability/embedding.metrics.js';
import { logger } from '@/shared/logger/logger.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

export interface OpenRouterEmbeddingProviderOptions extends BaseEmbeddingProviderOptions {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly httpReferer?: string;
  readonly appTitle?: string;
  readonly allowFallbacks?: boolean;
  readonly providerOrder?: readonly string[];
  readonly dataCollectionPolicy?: string;
  readonly timeoutMs: number;
  readonly maxRetries: number;
  readonly requestDimensions?: number;
}

export interface EmbeddingProviderHealth {
  readonly provider: string;
  readonly model: string;
  readonly configured: boolean;
  readonly available: boolean;
  readonly expectedDimensions: number;
  readonly verifiedDimensions?: number;
}

export class OpenRouterEmbeddingProvider extends BaseEmbeddingProvider {
  private readonly client: OpenRouterEmbeddingClient;
  private readonly requestDimensions?: number;
  private readonly isConfigured: boolean;
  private cachedAvailability?: boolean;

  constructor(options: OpenRouterEmbeddingProviderOptions, http?: EmbeddingHttpClient) {
    super(options);
    this.requestDimensions = options.requestDimensions;
    this.isConfigured = Boolean(options.apiKey?.trim());

    const clientOptions: OpenRouterClientOptions = {
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
      httpReferer: options.httpReferer,
      appTitle: options.appTitle,
      allowFallbacks: options.allowFallbacks,
      providerOrder: options.providerOrder,
      dataCollectionPolicy: options.dataCollectionPolicy,
      timeoutMs: options.timeoutMs,
      maxRetries: options.maxRetries,
    };

    this.client = new OpenRouterEmbeddingClient(clientOptions, http);
    recordActiveEmbeddingModel(this.provider, this.model);
  }

  async healthCheck(): Promise<EmbeddingProviderHealth> {
    let available = false;
    if (this.isConfigured) {
      if (this.cachedAvailability === undefined) {
        this.cachedAvailability = await this.client.probeModelAvailability(this.model);
      }
      available = this.cachedAvailability;
    }

    return {
      provider: 'openrouter',
      model: this.model,
      configured: this.isConfigured,
      available,
      expectedDimensions: this.dimensions,
      verifiedDimensions: available ? this.dimensions : undefined,
    };
  }

  protected async requestBatch(
    texts: readonly string[],
    purpose: EmbeddingPurpose,
  ): Promise<number[][]> {
    const startTime = Date.now();
    try {
      const result = await this.client.createEmbeddings({
        model: this.model,
        input: texts,
        dimensions: this.requestDimensions,
      });

      const durationMs = Date.now() - startTime;

      if (result.data.length !== texts.length) {
        throw new AppError(
          `OpenRouter embedding count mismatch: expected ${texts.length}, received ${result.data.length}`,
          502,
          'OPENROUTER_EMBEDDING_RESPONSE_INVALID',
        );
      }

      for (const item of result.data) {
        if (item.embedding.length !== this.dimensions) {
          recordDimensionMismatch(
            this.provider,
            this.model,
            this.dimensions,
            item.embedding.length,
          );
          throw new AppError(
            `Embedding dimension mismatch: expected ${this.dimensions}, received ${item.embedding.length}`,
            502,
            'EMBEDDING_DIMENSION_MISMATCH',
            {
              provider: this.provider,
              model: this.model,
              expectedDimensions: this.dimensions,
              actualDimensions: item.embedding.length,
            },
          );
        }
      }

      recordOpenRouterRequest({
        model: this.model,
        inputCount: texts.length,
        batchSize: texts.length,
        durationMs,
        success: true,
        tokenUsage: result.usage,
      });

      logger.info(
        {
          provider: 'openrouter',
          model: this.model,
          purpose,
          inputCount: texts.length,
          expectedDimensions: this.dimensions,
          actualDimensions: result.data[0]?.embedding.length,
          durationMs,
          tokenUsage: result.usage,
          success: true,
        },
        'OpenRouter embedding batch generated',
      );

      return result.data.map((item) => [...item.embedding]);
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      const errorCode = err instanceof AppError ? err.code : 'OPENROUTER_EMBEDDING_REQUEST_FAILED';

      recordOpenRouterRequest({
        model: this.model,
        inputCount: texts.length,
        batchSize: texts.length,
        durationMs,
        success: false,
        errorType: errorCode,
      });

      logger.error(
        {
          provider: 'openrouter',
          model: this.model,
          purpose,
          inputCount: texts.length,
          expectedDimensions: this.dimensions,
          durationMs,
          errorCode,
          success: false,
        },
        'OpenRouter embedding batch generation failed',
      );

      throw err;
    }
  }
}
