import type { CandidateRetrievalRegistry } from '@/modules/recommendations/providers/candidate-retrieval.registry.js';
import { recordRetrievalBackendLatency } from '@/modules/recommendations/observability/recommendation.metrics.js';
import type {
  RecommendationCandidate,
  RecommendationContext,
  RetrievalBackend,
} from '@/modules/recommendations/types/recommendations.types.js';

export class RecommendationRetrievalService {
  constructor(private readonly registry: CandidateRetrievalRegistry) {}

  async retrieve(input: {
    context: RecommendationContext;
    backend: RetrievalBackend;
    limit: number;
    excludeJobIds?: string[];
  }): Promise<RecommendationCandidate[]> {
    const start = Date.now();
    const result = await this.registry.retrieve({
      userId: input.context.userId,
      context: input.context,
      backend: input.backend,
      limit: input.limit,
      excludeJobIds: input.excludeJobIds,
    });
    recordRetrievalBackendLatency(input.backend, Date.now() - start);
    // Empty retrieval is a valid outcome (no vector matches / cold index).
    // Callers return an empty recommendation list instead of failing the request.
    return result.jobs.map((job) => ({
      job,
      retrievalScore: result.retrievalScores?.[job.id],
    }));
  }
}
