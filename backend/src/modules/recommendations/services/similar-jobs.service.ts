import {
  DEFAULT_RECOMMENDATION_LIMIT,
  DEFAULT_RETRIEVAL_BACKEND,
} from '@/modules/recommendations/constants/recommendation.constants.js';
import type { RecommendationContextService } from '@/modules/recommendations/services/recommendation-context.service.js';
import type { RecommendationRetrievalService } from '@/modules/recommendations/services/recommendation-retrieval.service.js';
import type { RecommendationScoringService } from '@/modules/recommendations/services/recommendation-scoring.service.js';
import type { RecommendationSourceAuthorizationService } from '@/modules/recommendations/services/recommendation-source-authorization.service.js';
import type { ScoredJobRecommendation } from '@/modules/recommendations/types/recommendations.types.js';

export class SimilarJobsService {
  constructor(
    private readonly sourceAuthorization: RecommendationSourceAuthorizationService,
    private readonly contextService: RecommendationContextService,
    private readonly retrievalService: RecommendationRetrievalService,
    private readonly scoringService: RecommendationScoringService,
  ) {}

  async findSimilar(
    userId: string,
    jobId: string,
    limit = DEFAULT_RECOMMENDATION_LIMIT,
  ): Promise<ScoredJobRecommendation[]> {
    const authorized = await this.sourceAuthorization.authorizeForSource(userId, {
      sourceType: 'JOB',
      sourceId: jobId,
    });
    const context = await this.contextService.build(authorized);
    const candidates = await this.retrievalService.retrieve({
      context,
      backend: DEFAULT_RETRIEVAL_BACKEND,
      limit,
      excludeJobIds: [jobId],
    });
    const scored = await this.scoringService.score(context, candidates);
    return [...scored].sort(
      (left, right) => right.scoreResult.overallScore - left.scoreResult.overallScore,
    );
  }
}
