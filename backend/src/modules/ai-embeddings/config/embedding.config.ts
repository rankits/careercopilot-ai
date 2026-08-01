import { JOB_EMBEDDING_DIMENSIONS } from '@/modules/job-embeddings/constants/job-embedding.constants.js';

const positiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const optional = (value: string | undefined): string | undefined => {
  const normalized = value?.trim();
  return normalized || undefined;
};

export const embeddingConfig = {
  provider: optional(process.env.AI_EMBEDDING_PROVIDER)?.toLowerCase(),
  model: optional(process.env.AI_EMBEDDING_MODEL),
  dimensions: positiveInteger(process.env.AI_EMBEDDING_DIMENSIONS, JOB_EMBEDDING_DIMENSIONS),
  timeoutMs: positiveInteger(process.env.AI_EMBEDDING_TIMEOUT_MS, 30_000),
  batchSize: positiveInteger(process.env.AI_EMBEDDING_BATCH_SIZE, 32),
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
} as const;

export type EmbeddingConfig = typeof embeddingConfig;
