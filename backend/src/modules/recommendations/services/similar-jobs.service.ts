import type { RecommendationRetrievalService } from '@/modules/recommendations/services/recommendation-retrieval.service.js';
import type {
  RecommendationCandidate,
  RecommendationContext,
  RetrievalBackend,
} from '@/modules/recommendations/types/recommendations.types.js';

export class SimilarJobsService {
  constructor(private readonly retrievalService: RecommendationRetrievalService) {}

  findSimilar(input: {
    sourceJobId: string;
    context: RecommendationContext;
    backend: RetrievalBackend;
    limit: number;
  }): Promise<RecommendationCandidate[]> {
    return this.retrievalService.retrieve({
      context: input.context,
      backend: input.backend,
      limit: input.limit,
      excludeJobIds: [input.sourceJobId],
    });
  }
}
