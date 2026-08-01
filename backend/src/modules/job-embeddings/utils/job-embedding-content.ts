import { createHash } from 'node:crypto';
import { JOB_EMBEDDING_DOCUMENT_SCHEMA_VERSION } from '@/modules/job-embeddings/constants/job-embedding.constants.js';
import {
  normalizeJobSemanticContent,
  serializeJobSemanticContent,
  type JobSemanticContent,
} from '@/modules/jobs/utils/job-semantic-content.js';

export const buildJobEmbeddingDocument = (content: JobSemanticContent): string => {
  const normalized = normalizeJobSemanticContent(content);
  return [
    `Title: ${normalized.title}`,
    `Company: ${normalized.companyName}`,
    `Employment type: ${normalized.employmentType ?? 'unspecified'}`,
    `Work arrangement: ${normalized.remoteType ?? 'unspecified'}`,
    `Skills: ${normalized.skills.join(', ') || 'unspecified'}`,
    `Tags: ${normalized.tags.join(', ') || 'unspecified'}`,
    `Description: ${normalized.descriptionText}`,
  ].join('\n');
};

export const createJobEmbeddingContentHash = (
  content: JobSemanticContent,
  documentSchemaVersion = JOB_EMBEDDING_DOCUMENT_SCHEMA_VERSION,
): string =>
  createHash('sha256')
    .update(`${documentSchemaVersion}\n${serializeJobSemanticContent(content)}`)
    .digest('hex');
