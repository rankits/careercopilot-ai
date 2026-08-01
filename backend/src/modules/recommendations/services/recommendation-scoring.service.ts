import type { RecommendationScoringEngine } from '@/modules/recommendations/scoring/recommendation-scoring.engine.js';
import {
  HEURISTIC_SCORE_BLEND_WEIGHT,
  RETRIEVAL_SCORE_BLEND_WEIGHT,
  assignRecommendationCategory,
} from '@/modules/recommendations/constants/recommendation.constants.js';
import type {
  RecommendationCandidate,
  RecommendationContext,
  ScoredJobRecommendation,
} from '@/modules/recommendations/types/recommendations.types.js';

const fuseOverallScore = (heuristicScore: number, retrievalScore?: number): number => {
  const retrieval = retrievalScore ?? 0;
  return RETRIEVAL_SCORE_BLEND_WEIGHT * retrieval + HEURISTIC_SCORE_BLEND_WEIGHT * heuristicScore;
};

export class RecommendationScoringService {
  constructor(private readonly engine: RecommendationScoringEngine) {}

  async score(
    context: RecommendationContext,
    candidates: readonly RecommendationCandidate[],
  ): Promise<ScoredJobRecommendation[]> {
    return Promise.all(
      candidates.map(async ({ job, retrievalScore }) => {
        const scored = await this.engine.score(context, job);
        const overallScore = fuseOverallScore(scored.scoreResult.overallScore, retrievalScore);
        return {
          ...scored,
          scoreResult: {
            ...scored.scoreResult,
            overallScore,
          },
          category: assignRecommendationCategory(overallScore),
        };
      }),
    );
  }
}
