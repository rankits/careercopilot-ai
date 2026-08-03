import type { Logger } from 'pino';
import type { JobEmbeddingIndexOutcome } from '@/modules/job-embeddings/services/job-embedding-indexer.service.js';

export interface JobEmbeddingCoverageSnapshot {
  activeJobs: number;
  embeddedJobs: number;
  coverageRatio: number;
}

export const computeEmbeddingCoverageRatio = (
  activeJobs: number,
  embeddedJobs: number,
): number => {
  if (activeJobs <= 0) return 1;
  return Math.min(1, embeddedJobs / activeJobs);
};

export const logJobEmbeddingIndexOutcome = (
  logger: Logger,
  input: {
    jobId: string;
    eventId: string;
    outcome: JobEmbeddingIndexOutcome;
  },
): void => {
  logger.info(
    {
      jobId: input.jobId,
      eventId: input.eventId,
      outcome: input.outcome,
      metric: 'job_embedding.index.outcome',
    },
    'Job embedding index outcome recorded',
  );
};

export const logJobEmbeddingCoverage = (
  logger: Logger,
  snapshot: JobEmbeddingCoverageSnapshot,
): void => {
  logger.info(
    {
      ...snapshot,
      metric: 'job_embedding.coverage',
    },
    'Job embedding coverage snapshot',
  );
};
