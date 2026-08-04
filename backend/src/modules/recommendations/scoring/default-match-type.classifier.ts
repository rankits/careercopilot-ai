import type { MatchTypeClassifier } from '@/modules/recommendations/scoring/recommendation-scoring.engine.js';
import type { RecommendationMatchType } from '@/modules/recommendations/types/recommendations.types.js';

/**
 * Deterministic match-type labels from overall score and required-skill coverage.
 * Richer title alias graphs can replace this later without changing the engine.
 */
export const defaultMatchTypeClassifier: MatchTypeClassifier = {
  classify(_context, _job, scoreResult): RecommendationMatchType {
    const hasExactSkill = scoreResult.matchedSkills.length > 0;
    const hasAliasSkill = scoreResult.aliasSkills.length > 0;
    const hasRelatedSkill = scoreResult.relatedSkills.length > 0;
    const hasTransferableSkill = scoreResult.transferableSkills.length > 0;
    const hasMissingSkill = scoreResult.missingSkills.length > 0;
    if (hasTransferableSkill) return 'TRANSFERABLE';
    if (hasRelatedSkill) return 'RELATED';
    if (hasMissingSkill && (hasExactSkill || hasAliasSkill)) return 'RELATED';
    if (hasAliasSkill) return 'ALIAS';
    if (hasExactSkill) return 'EXACT';
    if (hasMissingSkill) return 'MISSING';

    const required = scoreResult.components.requiredSkills;
    const overall = scoreResult.overallScore;
    if (required >= 0.9 && overall >= 0.85) return 'EXACT';
    if (required >= 0.7 && overall >= 0.7) return 'ALIAS';
    if (required >= 0.4 || overall >= 0.55) return 'RELATED';
    if (overall >= 0.35) return 'TRANSFERABLE';
    return 'MISSING';
  },
};
