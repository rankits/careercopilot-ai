import type {
  JobEmbeddingRecord,
  JobEmbeddingSearchResult,
  SearchJobEmbeddingsInput,
  UpsertJobEmbeddingInput,
} from '@/modules/job-embeddings/types/job-embedding.types.js';

export interface JobEmbeddingRepository {
  upsert(input: UpsertJobEmbeddingInput): Promise<JobEmbeddingRecord>;
  findCurrent(jobId: string, provider: string, model: string): Promise<JobEmbeddingRecord | null>;
  searchNearest(input: SearchJobEmbeddingsInput): Promise<JobEmbeddingSearchResult[]>;
  deleteForJob(jobId: string): Promise<number>;
}
