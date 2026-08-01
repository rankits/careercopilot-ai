import { createEmbeddingProvider } from '@/modules/ai-embeddings/index.js';
import type { EmbeddingProvider } from '@/modules/ai-embeddings/contracts/embedding-provider.js';
import type { IJobSearchRepository } from '@/modules/job-listing/contracts/IJobSearchRepository.js';
import type { JobEmbeddingRepository } from '@/modules/job-embeddings/contracts/job-embedding.repository.js';
import type {
  CandidateRetrievalProvider,
  CandidateRetrievalRequest,
  CandidateRetrievalResult,
} from '@/modules/recommendations/contracts/recommendation-provider.contracts.js';
import {
  RECOMMENDATION_ERROR_CODES,
  RecommendationError,
} from '@/modules/recommendations/errors/recommendation.error.js';
import { passesCandidateJobFilters } from '@/modules/recommendations/utils/candidate-job-filters.js';
import { buildRecommendationQueryText } from '@/modules/recommendations/utils/recommendation-query-text.js';
import type { RetrievalBackend } from '@/modules/recommendations/types/recommendations.types.js';

export class PgVectorCandidateRetrievalProvider implements CandidateRetrievalProvider {
  readonly supportedBackends: readonly RetrievalBackend[] = ['PGVECTOR'];

  constructor(
    private readonly embeddings: JobEmbeddingRepository,
    private readonly jobs: IJobSearchRepository,
    private readonly createProvider: () => EmbeddingProvider = createEmbeddingProvider,
  ) {}

  async retrieve(request: CandidateRetrievalRequest): Promise<CandidateRetrievalResult> {
    if (request.limit < 1) {
      throw new RecommendationError(
        'Candidate retrieval limit must be a positive integer',
        422,
        RECOMMENDATION_ERROR_CODES.CONTEXT_INVALID,
      );
    }

    const provider = this.createProvider();
    const queryText = buildRecommendationQueryText(request.context);
    if (!queryText.trim()) {
      throw new RecommendationError(
        'Recommendation context did not produce a retrieval query',
        422,
        RECOMMENDATION_ERROR_CODES.CONTEXT_INVALID,
      );
    }

    let queryEmbedding: number[];
    try {
      queryEmbedding = await provider.generateEmbedding(queryText, 'QUERY');
    } catch {
      throw new RecommendationError(
        'Embedding provider failed while generating the recommendation query',
        503,
        RECOMMENDATION_ERROR_CODES.EMBEDDING_PROVIDER_UNAVAILABLE,
      );
    }

    const remoteTypes = request.context.remotePreference
      ? [request.context.remotePreference]
      : undefined;
    const nearest = await this.embeddings.searchNearest({
      provider: provider.provider,
      model: provider.model,
      embedding: queryEmbedding,
      // Over-fetch so location/employment/company post-filters can still fill the limit.
      limit: Math.min(request.limit * 4, 200),
      filters: {
        excludeJobIds: request.excludeJobIds,
        remoteTypes,
        minSalary: request.context.salaryExpectation.minimum,
        maxSalary: request.context.salaryExpectation.maximum,
        currency: request.context.salaryExpectation.currency,
      },
    });

    const jobs = await this.jobs.findByIds(nearest.map((result) => result.jobId));
    const scoreByJobId = new Map(nearest.map((result) => [result.jobId, result.similarity]));

    const filtered = jobs
      .filter((job) => passesCandidateJobFilters(job, request.context))
      .slice(0, request.limit);

    const retrievalScores = Object.fromEntries(
      filtered.map((job) => [job.id, scoreByJobId.get(job.id) ?? 0]),
    );

    return {
      jobs: filtered,
      backend: 'PGVECTOR',
      totalCandidates: nearest.length,
      retrievalScores,
    };
  }
}
