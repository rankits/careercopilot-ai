import { JOB_EMBEDDING_DIMENSIONS } from '@/modules/job-embeddings/constants/job-embedding.constants.js';

const positiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const optionalPositiveInteger = (value: string | undefined): number | undefined => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

const optional = (value: string | undefined): string | undefined => {
  const normalized = value?.trim();
  return normalized || undefined;
};

const prefer = (...values: Array<string | undefined>): string | undefined => {
  for (const value of values) {
    const normalized = optional(value);
    if (normalized) return normalized;
  }
  return undefined;
};

const parseAllowFallbacks = (value: string | undefined): boolean | undefined => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

const parseProviderOrder = (value: string | undefined): string[] | undefined => {
  const normalized = optional(value);
  if (!normalized) return undefined;
  const items = normalized
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
};

export interface OpenRouterEmbeddingSettings {
  readonly apiKey: string | undefined;
  readonly apiKeyEnvName: string;
  readonly baseUrl: string;
  readonly httpReferer: string | undefined;
  readonly appTitle: string;
  readonly allowFallbacks: boolean | undefined;
  readonly providerOrder: string[] | undefined;
  readonly dataCollectionPolicy: string | undefined;
}

const buildOpenRouterSettings = (input: {
  apiKey: string | undefined;
  apiKeyEnvName: string;
  baseUrl: string | undefined;
  httpReferer: string | undefined;
  appTitle: string | undefined;
  allowFallbacks: boolean | undefined;
  providerOrder: string[] | undefined;
  dataCollectionPolicy: string | undefined;
}): OpenRouterEmbeddingSettings => ({
  apiKey: input.apiKey,
  apiKeyEnvName: input.apiKeyEnvName,
  baseUrl: input.baseUrl ?? 'https://openrouter.ai/api/v1',
  httpReferer: input.httpReferer,
  appTitle: input.appTitle ?? 'Career Copilot',
  allowFallbacks: input.allowFallbacks,
  providerOrder: input.providerOrder,
  dataCollectionPolicy: input.dataCollectionPolicy,
});

/** Shared / job-worker OpenRouter credentials. */
export const defaultOpenRouterEmbeddingSettings = (): OpenRouterEmbeddingSettings =>
  buildOpenRouterSettings({
    apiKey: optional(process.env.OPENROUTER_API_KEY),
    apiKeyEnvName: 'OPENROUTER_API_KEY',
    baseUrl: optional(process.env.OPENROUTER_BASE_URL),
    httpReferer: optional(process.env.OPENROUTER_HTTP_REFERER),
    appTitle: optional(process.env.OPENROUTER_APP_TITLE),
    allowFallbacks: parseAllowFallbacks(process.env.OPENROUTER_ALLOW_FALLBACKS),
    providerOrder: parseProviderOrder(process.env.OPENROUTER_PROVIDER_ORDER),
    dataCollectionPolicy: optional(process.env.OPENROUTER_DATA_COLLECTION_POLICY),
  });

/**
 * Recommendation query/candidate embedding OpenRouter credentials.
 * Prefers OPENROUTER_RECOMMENDATION_* then falls back to shared OPENROUTER_*.
 */
export const recommendationOpenRouterEmbeddingSettings = (): OpenRouterEmbeddingSettings => {
  const recommendationKey = optional(process.env.OPENROUTER_RECOMMENDATION_API_KEY);
  return buildOpenRouterSettings({
    apiKey: prefer(recommendationKey, process.env.OPENROUTER_API_KEY),
    apiKeyEnvName: recommendationKey
      ? 'OPENROUTER_RECOMMENDATION_API_KEY'
      : 'OPENROUTER_RECOMMENDATION_API_KEY or OPENROUTER_API_KEY',
    baseUrl: prefer(
      process.env.OPENROUTER_RECOMMENDATION_BASE_URL,
      process.env.OPENROUTER_BASE_URL,
    ),
    httpReferer: prefer(
      process.env.OPENROUTER_RECOMMENDATION_HTTP_REFERER,
      process.env.OPENROUTER_HTTP_REFERER,
    ),
    appTitle: prefer(
      process.env.OPENROUTER_RECOMMENDATION_APP_TITLE,
      process.env.OPENROUTER_APP_TITLE,
    ),
    allowFallbacks:
      parseAllowFallbacks(process.env.OPENROUTER_RECOMMENDATION_ALLOW_FALLBACKS) ??
      parseAllowFallbacks(process.env.OPENROUTER_ALLOW_FALLBACKS),
    providerOrder:
      parseProviderOrder(process.env.OPENROUTER_RECOMMENDATION_PROVIDER_ORDER) ??
      parseProviderOrder(process.env.OPENROUTER_PROVIDER_ORDER),
    dataCollectionPolicy: prefer(
      process.env.OPENROUTER_RECOMMENDATION_DATA_COLLECTION_POLICY,
      process.env.OPENROUTER_DATA_COLLECTION_POLICY,
    ),
  });
};

const buildEmbeddingConfig = (openrouter: OpenRouterEmbeddingSettings) =>
  ({
    provider: optional(process.env.AI_EMBEDDING_PROVIDER)?.toLowerCase(),
    model: optional(process.env.AI_EMBEDDING_MODEL),
    dimensions: positiveInteger(process.env.AI_EMBEDDING_DIMENSIONS, JOB_EMBEDDING_DIMENSIONS),
    requestDimensions: optionalPositiveInteger(process.env.AI_EMBEDDING_REQUEST_DIMENSIONS),
    timeoutMs: positiveInteger(process.env.AI_EMBEDDING_TIMEOUT_MS, 30_000),
    batchSize: positiveInteger(process.env.AI_EMBEDDING_BATCH_SIZE, 32),
    batchMaxCharacters: positiveInteger(process.env.AI_EMBEDDING_BATCH_MAX_CHARACTERS, 200_000),
    maxRetries: positiveInteger(process.env.AI_EMBEDDING_MAX_RETRIES, 3),
    documentPrefix: process.env.AI_EMBEDDING_DOCUMENT_PREFIX ?? '',
    queryPrefix: process.env.AI_EMBEDDING_QUERY_PREFIX ?? '',
    google: {
      apiKey: optional(process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY),
      baseUrl:
        optional(process.env.GOOGLE_EMBEDDING_BASE_URL) ??
        'https://generativelanguage.googleapis.com/v1beta',
    },
    groq: {
      apiKey: optional(process.env.GROQ_API_KEY),
      baseUrl: optional(process.env.GROQ_EMBEDDING_BASE_URL) ?? 'https://api.groq.com/openai/v1',
    },
    openrouter,
  }) as const;

export const embeddingConfig = buildEmbeddingConfig(defaultOpenRouterEmbeddingSettings());

/** Same embedding model settings, but OpenRouter auth scoped for recommendations. */
export const recommendationEmbeddingConfig = buildEmbeddingConfig(
  recommendationOpenRouterEmbeddingSettings(),
);

export type EmbeddingConfig = typeof embeddingConfig;
