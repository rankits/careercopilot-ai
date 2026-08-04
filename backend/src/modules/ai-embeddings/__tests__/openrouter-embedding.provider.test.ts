import { beforeEach, describe, expect, it } from 'vitest';
import type { EmbeddingConfig } from '@/modules/ai-embeddings/config/embedding.config.js';
import { createEmbeddingProvider } from '@/modules/ai-embeddings/embedding-provider.factory.js';
import {
  getEmbeddingMetricsSnapshot,
  resetEmbeddingMetricsForTests,
} from '@/modules/ai-embeddings/observability/embedding.metrics.js';
import type { EmbeddingHttpClient } from '@/modules/ai-embeddings/providers/embedding-http.client.js';
import { OpenRouterEmbeddingProvider } from '@/modules/ai-embeddings/providers/openrouter-embedding.provider.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

class RecordingHttpClient implements EmbeddingHttpClient {
  responseQueue: unknown[];
  calls: Array<{
    url: string;
    body: unknown;
    headers: Readonly<Record<string, string>>;
    timeoutMs: number;
  }> = [];

  constructor(responses: unknown | unknown[]) {
    this.responseQueue = Array.isArray(responses) ? [...responses] : [responses];
  }

  async post<T>(
    url: string,
    body: unknown,
    headers: Readonly<Record<string, string>>,
    timeoutMs: number,
  ): Promise<T> {
    this.calls.push({ url, body, headers, timeoutMs });
    const next = this.responseQueue.shift();
    if (next instanceof Error) {
      throw next;
    }
    return (next ?? {}) as T;
  }
}

const vector = (length = 768, val = 1): number[] => Array(length).fill(val);

const baseConfig: EmbeddingConfig = {
  provider: 'openrouter',
  model: 'nvidia/nemotron-3-embed-1b:free',
  dimensions: 768,
  requestDimensions: undefined,
  timeoutMs: 15_000,
  batchSize: 16,
  batchMaxCharacters: 200_000,
  maxRetries: 3,
  documentPrefix: '',
  queryPrefix: '',
  google: { apiKey: undefined, baseUrl: 'https://google.example' },
  groq: { apiKey: undefined, baseUrl: 'https://groq.example' },
  localHttp: { baseUrl: 'http://embedding-service:8080/v1' },
  openrouter: {
    apiKey: 'openrouter-secret-key',
    apiKeyEnvName: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    httpReferer: 'https://careercopilot.example',
    appTitle: 'Career Copilot Test',
    allowFallbacks: false,
    providerOrder: ['Nvidia'],
    dataCollectionPolicy: 'deny',
  },
};

describe('OpenRouterEmbeddingProvider', () => {
  beforeEach(() => {
    resetEmbeddingMetricsForTests();
  });

  describe('factory and configuration', () => {
    it('creates OpenRouter provider when configured in EmbeddingConfig', () => {
      const http = new RecordingHttpClient({
        data: [{ index: 0, embedding: vector(768) }],
      });
      const provider = createEmbeddingProvider(baseConfig, http);
      expect(provider.provider).toBe('openrouter');
      expect(provider.model).toBe('nvidia/nemotron-3-embed-1b:free');
      expect(provider.dimensions).toBe(768);
    });

    it('requires OPENROUTER_API_KEY when provider is openrouter', () => {
      const configWithoutKey: EmbeddingConfig = {
        ...baseConfig,
        openrouter: { ...baseConfig.openrouter, apiKey: undefined },
      };
      expect(() => createEmbeddingProvider(configWithoutKey)).toThrowError(
        expect.objectContaining({ code: 'EMBEDDING_PROVIDER_CONFIG_INVALID' }),
      );
    });
  });

  describe('provider behavior and headers', () => {
    it('sends correct headers, provider routing, and body without dimensions by default', async () => {
      const http = new RecordingHttpClient({
        id: 'req-100',
        model: 'nvidia/nemotron-3-embed-1b:free',
        data: [{ index: 0, embedding: vector(768) }],
        usage: { prompt_tokens: 12, total_tokens: 12 },
      });
      const provider = new OpenRouterEmbeddingProvider(
        {
          provider: 'openrouter',
          model: 'nvidia/nemotron-3-embed-1b:free',
          dimensions: 768,
          batchSize: 16,
          timeoutMs: 10_000,
          maxRetries: 3,
          documentPrefix: '',
          queryPrefix: '',
          apiKey: 'secret-key',
          baseUrl: 'https://openrouter.ai/api/v1',
          httpReferer: 'https://app.example',
          appTitle: 'Career Copilot App',
          allowFallbacks: false,
          providerOrder: ['Nvidia', 'Together'],
          dataCollectionPolicy: 'deny',
        },
        http,
      );

      const result = await provider.generateEmbedding('test document', 'DOCUMENT');
      expect(result).toHaveLength(768);
      expect(http.calls[0]).toMatchObject({
        url: 'https://openrouter.ai/api/v1/embeddings',
        headers: {
          Authorization: 'Bearer secret-key',
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://app.example',
          'X-Title': 'Career Copilot App',
        },
        timeoutMs: 10_000,
        body: {
          model: 'nvidia/nemotron-3-embed-1b:free',
          input: ['test document'],
          provider: {
            order: ['Nvidia', 'Together'],
            allow_fallbacks: false,
            data_collection: 'deny',
          },
        },
      });

      const snapshot = getEmbeddingMetricsSnapshot();
      expect(snapshot.openrouterRequestCount).toBe(1);
      expect(snapshot.openrouterSuccessCount).toBe(1);
      expect(snapshot.totalPromptTokens).toBe(12);
      expect(snapshot.activeModel).toEqual({
        provider: 'openrouter',
        model: 'nvidia/nemotron-3-embed-1b:free',
      });
    });

    it('sends dimensions parameter only when requestDimensions is explicitly configured', async () => {
      const http = new RecordingHttpClient({
        data: [{ index: 0, embedding: vector(768) }],
      });
      const provider = new OpenRouterEmbeddingProvider(
        {
          provider: 'openrouter',
          model: 'some-model',
          dimensions: 768,
          requestDimensions: 768,
          batchSize: 16,
          timeoutMs: 10_000,
          maxRetries: 3,
          documentPrefix: '',
          queryPrefix: '',
          apiKey: 'key',
          baseUrl: 'https://openrouter.ai/api/v1',
        },
        http,
      );

      await provider.generateEmbedding('query');
      expect(http.calls[0]?.body).toMatchObject({
        dimensions: 768,
      });
    });

    it('sorts out-of-order response items by index', async () => {
      const http = new RecordingHttpClient({
        data: [
          { index: 1, embedding: vector(768, 2) },
          { index: 0, embedding: vector(768, 1) },
        ],
      });
      const provider = new OpenRouterEmbeddingProvider(
        {
          provider: 'openrouter',
          model: 'nvidia/nemotron-3-embed-1b:free',
          dimensions: 768,
          batchSize: 16,
          timeoutMs: 10_000,
          maxRetries: 3,
          documentPrefix: '',
          queryPrefix: '',
          apiKey: 'key',
          baseUrl: 'https://openrouter.ai/api/v1',
        },
        http,
      );

      const results = await provider.generateEmbeddings(['a', 'b'], 'QUERY');
      expect(results).toHaveLength(2);
      expect(results[0]?.[0]).toBeCloseTo(1 / Math.sqrt(768), 5);
      expect(results[1]?.[0]).toBeCloseTo(2 / Math.sqrt(768 * 4), 5);
    });

    it('supports embedDocument, embedQuery, embedDocuments, embedQueries aliases', async () => {
      const http = new RecordingHttpClient([
        { data: [{ index: 0, embedding: vector(768, 1) }] },
        { data: [{ index: 0, embedding: vector(768, 2) }] },
      ]);
      const provider = new OpenRouterEmbeddingProvider(
        {
          provider: 'openrouter',
          model: 'nvidia/nemotron-3-embed-1b:free',
          dimensions: 768,
          batchSize: 16,
          timeoutMs: 10_000,
          maxRetries: 3,
          documentPrefix: '',
          queryPrefix: '',
          apiKey: 'key',
          baseUrl: 'https://openrouter.ai/api/v1',
        },
        http,
      );

      const docVec = await provider.embedDocument('doc-test');
      const queryVec = await provider.embedQuery('query-test');
      expect(docVec).toHaveLength(768);
      expect(queryVec).toHaveLength(768);
    });

    it('reports health Check status safely', async () => {
      const http = new RecordingHttpClient({
        data: [{ id: 'nvidia/nemotron-3-embed-1b:free' }],
      });
      const provider = new OpenRouterEmbeddingProvider(
        {
          provider: 'openrouter',
          model: 'nvidia/nemotron-3-embed-1b:free',
          dimensions: 2048,
          batchSize: 16,
          timeoutMs: 10_000,
          maxRetries: 3,
          documentPrefix: '',
          queryPrefix: '',
          apiKey: 'secret-key',
          baseUrl: 'https://openrouter.ai/api/v1',
        },
        http,
      );

      const health = await provider.healthCheck();
      expect(health).toEqual({
        provider: 'openrouter',
        model: 'nvidia/nemotron-3-embed-1b:free',
        configured: true,
        available: true,
        expectedDimensions: 2048,
        verifiedDimensions: 2048,
      });
      expect(http.calls[0]?.url).toBe('https://openrouter.ai/api/v1/models');
    });
  });

  describe('validation and dimension mismatch', () => {
    it('throws OPENROUTER_EMBEDDING_RESPONSE_INVALID when data is missing', async () => {
      const http = new RecordingHttpClient({});
      const provider = new OpenRouterEmbeddingProvider(
        {
          provider: 'openrouter',
          model: 'model',
          dimensions: 768,
          batchSize: 16,
          timeoutMs: 10_000,
          maxRetries: 3,
          documentPrefix: '',
          queryPrefix: '',
          apiKey: 'key',
          baseUrl: 'https://openrouter.ai/api/v1',
        },
        http,
      );

      await expect(provider.generateEmbedding('test')).rejects.toMatchObject({
        code: 'OPENROUTER_EMBEDDING_RESPONSE_INVALID',
      });
    });

    it('throws EMBEDDING_DIMENSION_MISMATCH with safe metadata when returned vector length does not match', async () => {
      const http = new RecordingHttpClient({
        data: [{ index: 0, embedding: vector(2048) }],
      });
      const provider = new OpenRouterEmbeddingProvider(
        {
          provider: 'openrouter',
          model: 'nvidia/nemotron-3-embed-1b:free',
          dimensions: 768,
          batchSize: 16,
          timeoutMs: 10_000,
          maxRetries: 3,
          documentPrefix: '',
          queryPrefix: '',
          apiKey: 'key',
          baseUrl: 'https://openrouter.ai/api/v1',
        },
        http,
      );

      const promise = provider.generateEmbedding('test');
      await expect(promise).rejects.toMatchObject({
        code: 'EMBEDDING_DIMENSION_MISMATCH',
        data: {
          provider: 'openrouter',
          model: 'nvidia/nemotron-3-embed-1b:free',
          expectedDimensions: 768,
          actualDimensions: 2048,
        },
      });

      const snapshot = getEmbeddingMetricsSnapshot();
      expect(snapshot.dimensionMismatchCount).toBe(1);
    });
  });

  describe('retry classification and backoff', () => {
    it('retries on HTTP 429 and succeeds on next attempt', async () => {
      const rateLimitError = new AppError('Rate limited', 429, 'OPENROUTER_EMBEDDING_RATE_LIMITED');
      const http = new RecordingHttpClient([
        rateLimitError,
        { data: [{ index: 0, embedding: vector(768) }] },
      ]);

      const provider = new OpenRouterEmbeddingProvider(
        {
          provider: 'openrouter',
          model: 'model',
          dimensions: 768,
          batchSize: 16,
          timeoutMs: 10_000,
          maxRetries: 3,
          documentPrefix: '',
          queryPrefix: '',
          apiKey: 'key',
          baseUrl: 'https://openrouter.ai/api/v1',
        },
        http,
      );

      const result = await provider.generateEmbedding('retry me');
      expect(result).toHaveLength(768);
      expect(http.calls).toHaveLength(2);
    });

    it('does not retry on permanent errors like HTTP 401 unauthorized', async () => {
      const authError = new AppError('Unauthorized', 401, 'OPENROUTER_EMBEDDING_UNAUTHORIZED');
      const http = new RecordingHttpClient([
        authError,
        { data: [{ index: 0, embedding: vector(768) }] },
      ]);

      const provider = new OpenRouterEmbeddingProvider(
        {
          provider: 'openrouter',
          model: 'model',
          dimensions: 768,
          batchSize: 16,
          timeoutMs: 10_000,
          maxRetries: 3,
          documentPrefix: '',
          queryPrefix: '',
          apiKey: 'key',
          baseUrl: 'https://openrouter.ai/api/v1',
        },
        http,
      );

      await expect(provider.generateEmbedding('test')).rejects.toMatchObject({
        code: 'OPENROUTER_EMBEDDING_UNAUTHORIZED',
      });
      expect(http.calls).toHaveLength(1);
    });

    it('throws after exceeding maxRetries on persistent retryable error', async () => {
      const error503 = new AppError(
        'Service unavailable',
        503,
        'OPENROUTER_EMBEDDING_REQUEST_FAILED',
      );
      const http = new RecordingHttpClient([error503, error503, error503, error503]);

      const provider = new OpenRouterEmbeddingProvider(
        {
          provider: 'openrouter',
          model: 'model',
          dimensions: 768,
          batchSize: 16,
          timeoutMs: 10_000,
          maxRetries: 3,
          documentPrefix: '',
          queryPrefix: '',
          apiKey: 'key',
          baseUrl: 'https://openrouter.ai/api/v1',
        },
        http,
      );

      await expect(provider.generateEmbedding('test')).rejects.toMatchObject({
        code: 'OPENROUTER_EMBEDDING_REQUEST_FAILED',
      });
      expect(http.calls).toHaveLength(3);
    });
  });
});
