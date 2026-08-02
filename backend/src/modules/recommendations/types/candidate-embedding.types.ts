import type { RecommendationSourceType } from '@/modules/recommendations/types/recommendations.types.js';

export interface CandidateEmbeddingIdentity {
  userId: string;
  sourceType: RecommendationSourceType;
  sourceId?: string | null;
  provider: string;
  model: string;
}

export interface CandidateEmbeddingRecord extends CandidateEmbeddingIdentity {
  id: string;
  sourceKey: string;
  dimensions: number;
  contentHash: string;
  embedding: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertCandidateEmbeddingInput extends CandidateEmbeddingIdentity {
  contentHash: string;
  embedding: readonly number[];
}

export interface FindFreshCandidateEmbeddingInput extends CandidateEmbeddingIdentity {
  contentHash: string;
}
