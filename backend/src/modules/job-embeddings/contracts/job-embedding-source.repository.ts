import type { JobEmbeddingSource } from '@/modules/job-embeddings/types/job-embedding.types.js';

export interface JobEmbeddingSourceRepository {
  findByJobId(jobId: string): Promise<JobEmbeddingSource | null>;
}
