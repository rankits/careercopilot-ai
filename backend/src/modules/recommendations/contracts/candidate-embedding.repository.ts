import type {
  CandidateEmbeddingIdentity,
  CandidateEmbeddingRecord,
  FindFreshCandidateEmbeddingInput,
  UpsertCandidateEmbeddingInput,
} from '@/modules/recommendations/types/candidate-embedding.types.js';

export interface CandidateEmbeddingRepository {
  findFresh(input: FindFreshCandidateEmbeddingInput): Promise<CandidateEmbeddingRecord | null>;
  upsert(input: UpsertCandidateEmbeddingInput): Promise<CandidateEmbeddingRecord>;
  deleteForUserSource(input: {
    userId: string;
    sourceType?: CandidateEmbeddingIdentity['sourceType'];
    sourceId?: string | null;
  }): Promise<number>;
}
