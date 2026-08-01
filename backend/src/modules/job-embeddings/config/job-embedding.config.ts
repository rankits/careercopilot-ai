import {
  JOB_EMBEDDING_DIMENSIONS,
  JOB_EMBEDDING_DOCUMENT_SCHEMA_VERSION,
} from '@/modules/job-embeddings/constants/job-embedding.constants.js';

const optionalValue = (value: string | undefined): string | undefined => {
  const normalized = value?.trim();
  return normalized || undefined;
};

export const jobEmbeddingConfig = {
  dimensions: JOB_EMBEDDING_DIMENSIONS,
  provider: optionalValue(process.env.JOB_EMBEDDING_PROVIDER)?.toLowerCase(),
  model: optionalValue(process.env.JOB_EMBEDDING_MODEL),
  documentSchemaVersion:
    optionalValue(process.env.JOB_EMBEDDING_DOCUMENT_SCHEMA_VERSION) ??
    JOB_EMBEDDING_DOCUMENT_SCHEMA_VERSION,
} as const;
