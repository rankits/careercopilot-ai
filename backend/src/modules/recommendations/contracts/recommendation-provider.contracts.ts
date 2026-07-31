import type { JobListDto } from '@/modules/job-listing/types/job-listing.types.js';
import type {
  ExtractedRecommendationContext,
  RecommendationCandidate,
  RecommendationContext,
  RetrievalBackend,
} from '@/modules/recommendations/types/recommendations.types.js';

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
}

export interface CandidateRetrievalProvider {
  readonly supportedBackends: readonly RetrievalBackend[];
  retrieve(request: CandidateRetrievalRequest): Promise<CandidateRetrievalResult>;
}

export interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
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
