import {
  JOB_EMBEDDING_DIMENSIONS,
  JOB_EMBEDDING_DOCUMENT_SCHEMA_VERSION,
} from '@/modules/job-embeddings/constants/job-embedding.constants.js';

const optionalValue = (value: string | undefined): string | undefined => {
  const normalized = value?.trim();
  return normalized || undefined;
};

const positiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const jobEmbeddingConfig = {
  dimensions: positiveInteger(process.env.AI_EMBEDDING_DIMENSIONS, JOB_EMBEDDING_DIMENSIONS),
  provider: optionalValue(process.env.AI_EMBEDDING_PROVIDER)?.toLowerCase(),
  model: optionalValue(process.env.AI_EMBEDDING_MODEL),
  documentSchemaVersion:
    optionalValue(process.env.JOB_EMBEDDING_DOCUMENT_SCHEMA_VERSION) ??
    JOB_EMBEDDING_DOCUMENT_SCHEMA_VERSION,
  backfillBatchSize: positiveInteger(process.env.JOB_EMBEDDING_BACKFILL_BATCH_SIZE, 100),
} as const;
