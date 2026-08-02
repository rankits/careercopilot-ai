import {
  embeddingConfig,
  type EmbeddingConfig,
} from '@/modules/ai-embeddings/config/embedding.config.js';
import type { EmbeddingProvider } from '@/modules/ai-embeddings/contracts/embedding-provider.js';
import type { EmbeddingHttpClient } from '@/modules/ai-embeddings/providers/embedding-http.client.js';
import { GoogleEmbeddingProvider } from '@/modules/ai-embeddings/providers/google-embedding.provider.js';
import { GroqEmbeddingProvider } from '@/modules/ai-embeddings/providers/groq-embedding.provider.js';
import { OpenRouterEmbeddingProvider } from '@/modules/ai-embeddings/providers/openrouter-embedding.provider.js';
import { JOB_EMBEDDING_DIMENSIONS } from '@/modules/job-embeddings/constants/job-embedding.constants.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

const required = (value: string | undefined, variable: string): string => {
  if (!value) {
    throw new AppError(`${variable} is required`, 500, 'EMBEDDING_PROVIDER_CONFIG_INVALID');
  }
  return value;
};

export const createEmbeddingProvider = (
  config: EmbeddingConfig = embeddingConfig,
  http?: EmbeddingHttpClient,
): EmbeddingProvider => {
  const provider = required(config.provider, 'AI_EMBEDDING_PROVIDER');
  const model = required(config.model, 'AI_EMBEDDING_MODEL');
  if (provider !== 'openrouter' && config.dimensions !== JOB_EMBEDDING_DIMENSIONS) {
    throw new AppError(
      `AI_EMBEDDING_DIMENSIONS must equal ${JOB_EMBEDDING_DIMENSIONS}`,
      500,
      'EMBEDDING_PROVIDER_CONFIG_INVALID',
    );
  }
  const base = {
    model,
    dimensions: config.dimensions,
    batchSize: config.batchSize,
    documentPrefix: config.documentPrefix,
    queryPrefix: config.queryPrefix,
  };

  if (provider === 'google' || provider === 'gemini') {
    return new GoogleEmbeddingProvider(
      {
        ...base,
        provider: 'google',
        apiKey: required(config.google.apiKey, 'GOOGLE_API_KEY'),
        baseUrl: config.google.baseUrl,
        timeoutMs: config.timeoutMs,
      },
      http,
    );
  }
  if (provider === 'groq') {
    return new GroqEmbeddingProvider(
      {
        ...base,
        provider: 'groq',
        apiKey: required(config.groq.apiKey, 'GROQ_API_KEY'),
        baseUrl: config.groq.baseUrl,
        timeoutMs: config.timeoutMs,
      },
      http,
    );
  }
  if (provider === 'openrouter') {
    return new OpenRouterEmbeddingProvider(
      {
        ...base,
        provider: 'openrouter',
        apiKey: required(config.openrouter.apiKey, 'OPENROUTER_API_KEY'),
        baseUrl: config.openrouter.baseUrl,
        httpReferer: config.openrouter.httpReferer,
        appTitle: config.openrouter.appTitle,
        allowFallbacks: config.openrouter.allowFallbacks,
        providerOrder: config.openrouter.providerOrder,
        dataCollectionPolicy: config.openrouter.dataCollectionPolicy,
        timeoutMs: config.timeoutMs,
        maxRetries: config.maxRetries,
        requestDimensions: config.requestDimensions,
      },
      http,
    );
  }
  throw new AppError(
    `Unsupported embedding provider: ${provider}`,
    501,
    'EMBEDDING_PROVIDER_UNSUPPORTED',
  );
};
