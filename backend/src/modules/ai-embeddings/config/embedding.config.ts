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

export const embeddingConfig = {
  provider: optional(process.env.AI_EMBEDDING_PROVIDER)?.toLowerCase(),
  model: optional(process.env.AI_EMBEDDING_MODEL),
  dimensions: positiveInteger(process.env.AI_EMBEDDING_DIMENSIONS, JOB_EMBEDDING_DIMENSIONS),
  requestDimensions: optionalPositiveInteger(process.env.AI_EMBEDDING_REQUEST_DIMENSIONS),
  timeoutMs: positiveInteger(process.env.AI_EMBEDDING_TIMEOUT_MS, 30_000),
  batchSize: positiveInteger(process.env.AI_EMBEDDING_BATCH_SIZE, 32),
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
  openrouter: {
    apiKey: optional(process.env.OPENROUTER_API_KEY),
    baseUrl: optional(process.env.OPENROUTER_BASE_URL) ?? 'https://openrouter.ai/api/v1',
    httpReferer: optional(process.env.OPENROUTER_HTTP_REFERER),
    appTitle: optional(process.env.OPENROUTER_APP_TITLE) ?? 'Career Copilot',
    allowFallbacks:
      process.env.OPENROUTER_ALLOW_FALLBACKS === 'true'
        ? true
        : process.env.OPENROUTER_ALLOW_FALLBACKS === 'false'
          ? false
          : undefined,
    providerOrder: optional(process.env.OPENROUTER_PROVIDER_ORDER)
      ? optional(process.env.OPENROUTER_PROVIDER_ORDER)!
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : undefined,
    dataCollectionPolicy: optional(process.env.OPENROUTER_DATA_COLLECTION_POLICY),
  },
} as const;

export type EmbeddingConfig = typeof embeddingConfig;
