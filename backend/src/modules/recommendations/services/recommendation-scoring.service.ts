import type { RecommendationScoringEngine } from '@/modules/recommendations/scoring/recommendation-scoring.engine.js';
import type {
  RecommendationCandidate,
  RecommendationContext,
  ScoredJobRecommendation,
} from '@/modules/recommendations/types/recommendations.types.js';

export class RecommendationScoringService {
  constructor(private readonly engine: RecommendationScoringEngine) {}

  score(
    context: RecommendationContext,
    candidates: readonly RecommendationCandidate[],
  ): Promise<ScoredJobRecommendation[]> {
    return Promise.all(candidates.map(({ job }) => this.engine.score(context, job)));
  }
}
