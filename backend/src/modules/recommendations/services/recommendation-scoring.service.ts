import type { RecommendationScoringEngine } from '@/modules/recommendations/scoring/recommendation-scoring.engine.js';
import {
  HEURISTIC_SCORE_BLEND_WEIGHT,
  RETRIEVAL_SCORE_BLEND_WEIGHT,
  assignRecommendationCategory,
} from '@/modules/recommendations/constants/recommendation.constants.js';
import {
  getCandidateJobFilterViolations,
  resolveRecommendationFilterMode,
} from '@/modules/recommendations/utils/candidate-job-filters.js';
import type {
  RecommendationCandidate,
  RecommendationContext,
  RecommendationReason,
  RecommendationCategory,
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

const flexibleFilterReason = (violations: readonly string[]): RecommendationReason => ({
  component: violations.some(
    (violation) =>
      violation === 'REQUIRED_CERTIFICATION' ||
      violation === 'WORK_AUTHORIZATION' ||
      violation === 'VISA_SPONSORSHIP',
  )
    ? 'qualifications'
    : violations.some((violation) => violation.startsWith('SALARY'))
      ? 'salary'
      : 'location',
  message: 'Flexible filter mode kept this stretch opportunity outside one or more preferences',
  evidence: violations.map((violation) => `filterViolation=${violation}`),
});

const capFlexibleCategory = (
  category: RecommendationCategory,
  hasViolation: boolean,
): RecommendationCategory => {
  if (!hasViolation) return category;
  return category === 'BEST_MATCH' || category === 'GOOD_MATCH'
    ? 'STRETCH_OPPORTUNITY'
    : category;
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
        const heuristicScore = scored.scoreResult.overallScore;
        const overallScore = fuseOverallScore(heuristicScore, retrievalScore);
        const filterViolations =
          resolveRecommendationFilterMode(context) === 'FLEXIBLE'
            ? getCandidateJobFilterViolations(job, context).filter(
                (violation) => violation !== 'EXCLUDED_COMPANY',
              )
            : [];
        const category = capFlexibleCategory(
          assignRecommendationCategory(overallScore),
          filterViolations.length > 0,
        );
        return {
          ...scored,
          scoreResult: {
            ...scored.scoreResult,
            overallScore,
            reasons: [
              ...scored.scoreResult.reasons,
              hybridReason(heuristicScore, retrievalScore),
              ...(filterViolations.length > 0 ? [flexibleFilterReason(filterViolations)] : []),
            ],
          },
          category,
        };
      }),
    );
  }
}
