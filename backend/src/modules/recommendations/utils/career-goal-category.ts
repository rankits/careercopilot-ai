import type { JobListDto } from '@/modules/job-listing/types/job-listing.types.js';
import type {
  RecommendationCategory,
  RecommendationContext,
  RecommendationMatchType,
  RecommendationReason,
  RecommendationScoreResult,
} from '@/modules/recommendations/types/recommendations.types.js';

export type CareerGoalPathKind =
  'TARGET_ROLE' | 'TRANSITIONAL_BRIDGE' | 'STRETCH_TARGET' | 'CURRENT_ROLE' | 'RELATED_PATH';

export interface CareerGoalCategoryResult {
  category: RecommendationCategory;
  pathKind: CareerGoalPathKind;
  reason: RecommendationReason;
}

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokens = (value: string): string[] =>
  normalize(value)
    .split(/\s+/)
    .filter((token) => token.length > 1);

const tokenOverlap = (candidate: string, desired: string): number => {
  const candidateTokens = new Set(tokens(candidate));
  const desiredTokens = tokens(desired);
  if (candidateTokens.size === 0 || desiredTokens.length === 0) return 0;
  const matches = desiredTokens.filter((token) => candidateTokens.has(token)).length;
  return matches / desiredTokens.length;
};

const titleMatchesAny = (jobTitle: string, titles: readonly string[]): boolean => {
  const normalizedTitle = normalize(jobTitle);
  return titles.some((title) => {
    const normalizedTarget = normalize(title);
    if (!normalizedTarget) return false;
    return (
      normalizedTitle.includes(normalizedTarget) ||
      normalizedTarget.includes(normalizedTitle) ||
      tokenOverlap(normalizedTitle, normalizedTarget) >= 0.6
    );
  });
};

const uniqueStrings = (values: Array<string | undefined>): string[] => [
  ...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]),
];

const severeSkillGap = (
  scoreResult: RecommendationScoreResult,
  matchType: RecommendationMatchType,
): boolean => {
  const positiveSkillEvidence =
    scoreResult.matchedSkills.length +
    scoreResult.aliasSkills.length +
    scoreResult.relatedSkills.length +
    scoreResult.transferableSkills.length;
  return (
    matchType === 'MISSING' ||
    scoreResult.missingSkills.length > positiveSkillEvidence ||
    scoreResult.components.requiredSkills < 0.45
  );
};

const bridgeSkillEvidence = (scoreResult: RecommendationScoreResult): boolean =>
  scoreResult.matchedSkills.length > 0 ||
  scoreResult.aliasSkills.length > 0 ||
  scoreResult.relatedSkills.length > 0 ||
  scoreResult.transferableSkills.length > 0;

const categoryReason = (
  category: RecommendationCategory,
  pathKind: CareerGoalPathKind,
  evidence: string[],
): CareerGoalCategoryResult => ({
  category,
  pathKind,
  reason: {
    component: 'title',
    message: `Career goal path classification: ${pathKind.toLowerCase().replace(/_/g, ' ')}`,
    evidence: [`careerCategory=${category}`, `careerPathKind=${pathKind}`, ...evidence],
  },
});

export const classifyCareerGoalCategory = (
  context: RecommendationContext,
  job: JobListDto,
  scoreResult: RecommendationScoreResult,
  matchType: RecommendationMatchType,
  fallbackCategory: RecommendationCategory,
): CareerGoalCategoryResult | undefined => {
  if (context.sourceType !== 'CAREER_GOAL') return undefined;

  const targetTitles = uniqueStrings([
    context.goalIntent?.targetRole,
    context.targetRole,
    ...context.targetTitles,
  ]);
  const currentTitles = uniqueStrings([context.goalIntent?.currentRole, context.currentRole]);
  const relatedTitles = uniqueStrings(context.relatedTitles);
  const targetAligned = titleMatchesAny(job.title, targetTitles);
  const currentAligned = titleMatchesAny(job.title, currentTitles);
  const bridgeAligned =
    titleMatchesAny(job.title, relatedTitles) || bridgeSkillEvidence(scoreResult);
  const hasSevereSkillGap = severeSkillGap(scoreResult, matchType);
  const evidence = [
    ...targetTitles.slice(0, 3).map((title) => `targetRole=${title}`),
    ...currentTitles.slice(0, 2).map((title) => `currentRole=${title}`),
    `jobTitle=${job.title}`,
    `overallScore=${scoreResult.overallScore.toFixed(4)}`,
  ];

  if (targetAligned) {
    if (hasSevereSkillGap || scoreResult.overallScore < 0.65) {
      return categoryReason('STRETCH_OPPORTUNITY', 'STRETCH_TARGET', evidence);
    }
    return categoryReason('BEST_MATCH', 'TARGET_ROLE', evidence);
  }

  if (currentAligned) {
    return categoryReason('RELATED_CAREER_PATH', 'CURRENT_ROLE', evidence);
  }

  if (bridgeAligned && scoreResult.overallScore >= 0.55) {
    return categoryReason('GOOD_MATCH', 'TRANSITIONAL_BRIDGE', evidence);
  }

  if (bridgeAligned && scoreResult.overallScore >= 0.45) {
    return categoryReason('STRETCH_OPPORTUNITY', 'TRANSITIONAL_BRIDGE', evidence);
  }

  if (fallbackCategory === 'BEST_MATCH') {
    return categoryReason('GOOD_MATCH', 'TRANSITIONAL_BRIDGE', evidence);
  }

  return categoryReason(fallbackCategory, 'RELATED_PATH', evidence);
};
