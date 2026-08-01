import type { RecommendationScoringEngine } from '@/modules/recommendations/scoring/recommendation-scoring.engine.js';
import {
  HEURISTIC_SCORE_BLEND_WEIGHT,
  RETRIEVAL_SCORE_BLEND_WEIGHT,
  assignRecommendationCategory,
} from '@/modules/recommendations/constants/recommendation.constants.js';
import type {
  RecommendationCandidate,
  RecommendationContext,
  RecommendationReason,
  ScoredJobRecommendation,
} from '@/modules/recommendations/types/recommendations.types.js';
import { formatHybridScoreExplanation } from '@/modules/recommendations/utils/recommendation-match-labels.js';

const fuseOverallScore = (heuristicScore: number, retrievalScore?: number): number => {
  const retrieval = retrievalScore ?? 0;
  return RETRIEVAL_SCORE_BLEND_WEIGHT * retrieval + HEURISTIC_SCORE_BLEND_WEIGHT * heuristicScore;
};

const hybridReason = (
  heuristicScore: number,
  retrievalScore: number | undefined,
): RecommendationReason => ({
  component: 'title',
  message: formatHybridScoreExplanation(heuristicScore, retrievalScore),
  evidence: [
    `retrievalWeight=${RETRIEVAL_SCORE_BLEND_WEIGHT}`,
    `heuristicWeight=${HEURISTIC_SCORE_BLEND_WEIGHT}`,
    ...(retrievalScore !== undefined ? [`retrievalScore=${retrievalScore.toFixed(4)}`] : []),
    `heuristicScore=${heuristicScore.toFixed(4)}`,
  ],
});

export class RecommendationScoringService {
  constructor(private readonly engine: RecommendationScoringEngine) {}

  async score(
    context: RecommendationContext,
    candidates: readonly RecommendationCandidate[],
  ): Promise<ScoredJobRecommendation[]> {
    return Promise.all(
      candidates.map(async ({ job, retrievalScore }) => {
        const scored = await this.engine.score(context, job);
        const heuristicScore = scored.scoreResult.overallScore;
        const overallScore = fuseOverallScore(heuristicScore, retrievalScore);
        return {
          ...scored,
          scoreResult: {
            ...scored.scoreResult,
            overallScore,
            reasons: [...scored.scoreResult.reasons, hybridReason(heuristicScore, retrievalScore)],
          },
          category: assignRecommendationCategory(overallScore),
        };
      }),
    );
  }
}
