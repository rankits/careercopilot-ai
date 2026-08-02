import { describe, expect, it } from 'vitest';
import type { EmbeddingConfig } from '@/modules/ai-embeddings/config/embedding.config.js';
import { createEmbeddingProvider } from '@/modules/ai-embeddings/embedding-provider.factory.js';
import type { EmbeddingHttpClient } from '@/modules/ai-embeddings/providers/embedding-http.client.js';
import { GoogleEmbeddingProvider } from '@/modules/ai-embeddings/providers/google-embedding.provider.js';
import { GroqEmbeddingProvider } from '@/modules/ai-embeddings/providers/groq-embedding.provider.js';
import { JOB_EMBEDDING_DIMENSIONS } from '@/modules/job-embeddings/constants/job-embedding.constants.js';

class RecordingHttpClient implements EmbeddingHttpClient {
  response: unknown;
  calls: Array<{
    url: string;
    body: unknown;
    headers: Readonly<Record<string, string>>;
    timeoutMs: number;
  }> = [];

  constructor(response: unknown) {
    this.response = response;
  }

  async post<T>(
    url: string,
    body: unknown,
    headers: Readonly<Record<string, string>>,
    timeoutMs: number,
  ): Promise<T> {
    this.calls.push({ url, body, headers, timeoutMs });
    return this.response as T;
  }
}

const vector = (value = 1): number[] => Array(JOB_EMBEDDING_DIMENSIONS).fill(value);
const base = {
  model: 'configured-model',
  dimensions: JOB_EMBEDDING_DIMENSIONS,
  requestDimensions: undefined,
  batchSize: 32,
  maxRetries: 3,
  documentPrefix: '',
  queryPrefix: '',
  apiKey: 'secret',
  timeoutMs: 12_000,
};

const mockOpenRouterConfig = {
  apiKey: 'openrouter-key',
  baseUrl: 'https://openrouter.example',
  httpReferer: undefined,
  appTitle: 'Career Copilot',
  allowFallbacks: undefined,
  providerOrder: undefined,
  dataCollectionPolicy: undefined,
};

describe('embedding providers', () => {
  it('selects provider and model entirely from configuration', () => {
    const config: EmbeddingConfig = {
      provider: 'groq',
      model: 'env-selected-model',
      dimensions: JOB_EMBEDDING_DIMENSIONS,
      requestDimensions: undefined,
      timeoutMs: 10_000,
      batchSize: 16,
      maxRetries: 3,
      documentPrefix: 'doc: ',
      queryPrefix: 'query: ',
      google: { apiKey: undefined, baseUrl: 'https://google.example' },
      groq: { apiKey: 'groq-key', baseUrl: 'https://groq.example' },
      openrouter: mockOpenRouterConfig,
    };

    const provider = createEmbeddingProvider(
      config,
      new RecordingHttpClient({ data: [{ index: 0, embedding: vector() }] }),
    );

    expect(provider.provider).toBe('groq');
    expect(provider.model).toBe('env-selected-model');
  });

  it('rejects configured dimensions that do not match the job embedding index', () => {
    const config: EmbeddingConfig = {
      provider: 'groq',
      model: 'env-selected-model',
      dimensions: JOB_EMBEDDING_DIMENSIONS + 1,
      requestDimensions: undefined,
      timeoutMs: 10_000,
      batchSize: 16,
      maxRetries: 3,
      documentPrefix: 'doc: ',
      queryPrefix: 'query: ',
      google: { apiKey: undefined, baseUrl: 'https://google.example' },
      groq: { apiKey: 'groq-key', baseUrl: 'https://groq.example' },
      openrouter: mockOpenRouterConfig,
    };

    expect(() =>
      createEmbeddingProvider(
        config,
        new RecordingHttpClient({ data: [{ index: 0, embedding: vector() }] }),
      ),
    ).toThrowError(expect.objectContaining({ code: 'EMBEDDING_PROVIDER_CONFIG_INVALID' }));
  });

  it('requests configurable Gemini embeddings with retrieval purpose and dimensions', async () => {
    const http = new RecordingHttpClient({ embeddings: [{ values: vector() }] });
    const provider = new GoogleEmbeddingProvider(
      {
        ...base,
        provider: 'google',
        baseUrl: 'https://google.example/v1beta/',
      },
      http,
    );

    const result = await provider.generateEmbedding('job document', 'DOCUMENT');

    expect(result).toHaveLength(JOB_EMBEDDING_DIMENSIONS);
    expect(http.calls[0]).toMatchObject({
      url: 'https://google.example/v1beta/models/configured-model:batchEmbedContents',
      headers: { 'x-goog-api-key': 'secret' },
      timeoutMs: 12_000,
      body: {
        requests: [
          {
            model: 'models/configured-model',
            content: { parts: [{ text: 'job document' }] },
            taskType: 'RETRIEVAL_DOCUMENT',
            outputDimensionality: JOB_EMBEDDING_DIMENSIONS,
          },
        ],
      },
    });
  });

  it('uses Groq OpenAI-compatible embeddings without a provider SDK', async () => {
    const http = new RecordingHttpClient({
      data: [
        { index: 1, embedding: vector(2) },
        { index: 0, embedding: vector(1) },
      ],
    });
    const provider = new GroqEmbeddingProvider(
      {
        ...base,
        provider: 'groq',
        baseUrl: 'https://groq.example/openai/v1/',
      },
      http,
    );

    const result = await provider.generateEmbeddings(['first', 'second'], 'QUERY');

    expect(result).toHaveLength(2);
    expect(http.calls[0]).toMatchObject({
      url: 'https://groq.example/openai/v1/embeddings',
      headers: { authorization: 'Bearer secret' },
      body: {
        input: ['first', 'second'],
        model: 'configured-model',
        encoding_format: 'float',
      },
    });
  });

  it('rejects provider vectors that do not match the configured database dimensions', async () => {
    const http = new RecordingHttpClient({ data: [{ index: 0, embedding: [1, 2] }] });
    const provider = new GroqEmbeddingProvider(
      {
        ...base,
        provider: 'groq',
        baseUrl: 'https://groq.example/openai/v1',
      },
      http,
    );

    await expect(provider.generateEmbedding('query')).rejects.toMatchObject({
      statusCode: 502,
      code: 'INVALID_EMBEDDING_RESPONSE',
    });
  });
});
