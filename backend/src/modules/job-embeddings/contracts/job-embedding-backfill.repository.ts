import type {
  JobEmbeddingBackfillBatch,
  JobEmbeddingBackfillCandidate,
} from '@/modules/job-embeddings/types/job-embedding-backfill.types.js';
import type { JobSemanticContentChangedEvent } from '@/modules/jobs/events/job.events.js';

export interface JobEmbeddingBackfillScanInput {
  readonly provider: string;
  readonly model: string;
  readonly batchSize: number;
  readonly afterJobId?: string;
}

export interface JobEmbeddingBackfillRepository {
  scanActiveJobs(input: JobEmbeddingBackfillScanInput): Promise<JobEmbeddingBackfillBatch>;
  enqueueSemanticChange(event: JobSemanticContentChangedEvent): Promise<void>;
}

export type { JobEmbeddingBackfillCandidate };
