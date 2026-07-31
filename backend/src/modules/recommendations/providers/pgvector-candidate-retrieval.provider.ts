import { createEmbeddingProvider } from '@/modules/ai-embeddings/index.js';
import type { EmbeddingProvider } from '@/modules/ai-embeddings/contracts/embedding-provider.js';
import type { IJobSearchRepository } from '@/modules/job-listing/contracts/IJobSearchRepository.js';
import type { JobListDto } from '@/modules/job-listing/types/job-listing.types.js';
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
import { buildRecommendationQueryText } from '@/modules/recommendations/utils/recommendation-query-text.js';
import type { RetrievalBackend } from '@/modules/recommendations/types/recommendations.types.js';

const normalizeToken = (value: string): string => value.trim().toLowerCase();

const matchesEmploymentType = (job: JobListDto, allowed: readonly string[]): boolean => {
  if (!allowed.length) return true;
  if (!job.employmentType) return false;
  const current = normalizeToken(job.employmentType);
  return allowed.some((value) => normalizeToken(value) === current);
};

const isExcludedCompany = (job: JobListDto, excluded: readonly string[]): boolean => {
  if (!excluded.length) return false;
  const companyName = normalizeToken(job.company.name);
  const companySlug = normalizeToken(job.company.slug);
  return excluded.some((value) => {
    const token = normalizeToken(value);
    return token === companyName || token === companySlug;
  });
};

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
      // Over-fetch so post-filters for employment type / excluded companies can
      // still return up to the requested candidate limit.
      limit: Math.min(request.limit * 3, 200),
      filters: {
        excludeJobIds: request.excludeJobIds,
        remoteTypes,
        minSalary: request.context.salaryExpectation.minimum,
      },
    });

    const jobs = await this.jobs.findByIds(nearest.map((result) => result.jobId));
    const scoreByJobId = new Map(nearest.map((result) => [result.jobId, result.similarity]));
    const employmentTypes = request.context.employmentTypes;
    const excludedCompanies = request.context.excludedCompanies;

    const filtered = jobs
      .filter((job) => matchesEmploymentType(job, employmentTypes))
      .filter((job) => !isExcludedCompany(job, excludedCompanies))
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
