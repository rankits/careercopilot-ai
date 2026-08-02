import type { JobListDto } from '@/modules/job-listing/types/job-listing.types.js';
import type {
  ExtractedRecommendationContext,
  RecommendationCandidate,
  RecommendationContext,
  RetrievalBackend,
} from '@/modules/recommendations/types/recommendations.types.js';
export type { EmbeddingProvider } from '@/modules/ai-embeddings/contracts/embedding-provider.js';

export interface CandidateRetrievalRequest {
  userId: string;
  context: RecommendationContext;
  backend: RetrievalBackend;
  limit: number;
  excludeJobIds?: string[];
}

export interface CandidateRetrievalResult {
  jobs: JobListDto[];
  backend: RetrievalBackend;
  totalCandidates?: number;
  /** Cosine similarity (or equivalent) keyed by job id when the backend provides one. */
  retrievalScores?: Readonly<Record<string, number>>;
  metadata?: {
    embeddingCacheHit?: boolean;
    candidateEmbeddingCacheHit?: boolean;
    retrievalCandidateCount?: number;
    retrievalLatencyMs?: number;
  };
}

export interface CandidateRetrievalProvider {
  readonly supportedBackends: readonly RetrievalBackend[];
  retrieve(request: CandidateRetrievalRequest): Promise<CandidateRetrievalResult>;
}

export interface RecommendationExtractionProvider {
  extractContextFromText(text: string): Promise<ExtractedRecommendationContext>;
}

export interface RecommendationReranker {
  rerank(
    context: RecommendationContext,
    candidates: RecommendationCandidate[],
  ): Promise<RecommendationCandidate[]>;
}
