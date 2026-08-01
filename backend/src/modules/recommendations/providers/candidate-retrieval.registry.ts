import type {
  CandidateRetrievalProvider,
  CandidateRetrievalRequest,
  CandidateRetrievalResult,
} from '@/modules/recommendations/contracts/recommendation-provider.contracts.js';
import {
  RECOMMENDATION_ERROR_CODES,
  RecommendationError,
} from '@/modules/recommendations/errors/recommendation.error.js';
import type { RetrievalBackend } from '@/modules/recommendations/types/recommendations.types.js';

export class CandidateRetrievalRegistry {
  private readonly providers = new Map<RetrievalBackend, CandidateRetrievalProvider>();

  constructor(providers: readonly CandidateRetrievalProvider[] = []) {
    for (const provider of providers) {
      for (const backend of provider.supportedBackends) this.providers.set(backend, provider);
    }
  }

  async retrieve(request: CandidateRetrievalRequest): Promise<CandidateRetrievalResult> {
    const provider = this.providers.get(request.backend);
    if (!provider) {
      throw new RecommendationError(
        `Candidate retrieval backend ${request.backend} is not configured`,
        501,
        RECOMMENDATION_ERROR_CODES.NOT_IMPLEMENTED,
      );
    }
    return provider.retrieve(request);
  }
}
