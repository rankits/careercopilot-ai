import type { MatchTypeClassifier } from '@/modules/recommendations/scoring/recommendation-scoring.engine.js';
import type { RecommendationMatchType } from '@/modules/recommendations/types/recommendations.types.js';

/**
 * Deterministic match-type labels from overall score and required-skill coverage.
 * Richer title alias graphs can replace this later without changing the engine.
 */
export const defaultMatchTypeClassifier: MatchTypeClassifier = {
  classify(_context, _job, scoreResult): RecommendationMatchType {
    const required = scoreResult.components.requiredSkills;
    const overall = scoreResult.overallScore;
    if (required >= 0.9 && overall >= 0.85) return 'EXACT';
    if (required >= 0.7 && overall >= 0.7) return 'ALIAS';
    if (required >= 0.4 || overall >= 0.55) return 'RELATED';
    if (overall >= 0.35) return 'TRANSFERABLE';
    return 'MISSING';
  },
};
