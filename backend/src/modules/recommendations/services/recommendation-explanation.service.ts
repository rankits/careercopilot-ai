import {
  DEFAULT_RECOMMENDATION_WEIGHTS,
  HEURISTIC_SCORE_BLEND_WEIGHT,
  RETRIEVAL_SCORE_BLEND_WEIGHT,
} from '@/modules/recommendations/constants/recommendation.constants.js';
import type {
  JobRecommendationRecord,
  RecommendationExplanation,
  RecommendationExplanationBullet,
  RecommendationReason,
  RecommendationScoreComponentName,
  RecommendationScoreResult,
  RecommendationSkillGap,
} from '@/modules/recommendations/types/recommendations.types.js';
import { normalizeRecommendationSkillBuckets } from '@/modules/recommendations/skills/recommendation-skill-buckets.js';

const COMPONENT_LABELS: Record<RecommendationScoreComponentName, string> = {
  requiredSkills: 'Required skills',
  title: 'Title match',
  experience: 'Experience',
  responsibilities: 'Responsibilities',
  preferredSkills: 'Preferred skills',
  location: 'Location',
  industry: 'Industry',
  salary: 'Salary',
  qualifications: 'Qualifications',
};

const isHybridReason = (reason: RecommendationReason): boolean =>
  reason.evidence.some(
    (entry) => entry.startsWith('retrievalWeight=') || entry.startsWith('heuristicWeight='),
  );

const parseEvidenceNumber = (
  evidence: readonly string[],
  key: 'heuristicScore' | 'retrievalScore',
): number | undefined => {
  const prefix = `${key}=`;
  const value = evidence.find((entry) => entry.startsWith(prefix))?.slice(prefix.length);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const displayScore = (overallScore: number): number | undefined => {
  if (!Number.isFinite(overallScore) || overallScore < 0 || overallScore > 1) return undefined;
  return Math.round(overallScore * 100);
};

export const buildRecommendationSkillGap = (
  scoreResult: RecommendationScoreResult,
): RecommendationSkillGap => {
  const buckets = normalizeRecommendationSkillBuckets(scoreResult);
  return {
    exact: buckets.matchedSkills,
    alias: buckets.aliasSkills,
    related: buckets.relatedSkills,
    transferable: buckets.transferableSkills,
    missing: buckets.missingSkills,
  };
};

export const buildRecommendationExplanation = (
  record: JobRecommendationRecord,
): RecommendationExplanation => {
  const reasonsByComponent = new Map<RecommendationScoreComponentName, RecommendationReason[]>();
  const hybrid = record.scoreResult.reasons.find(isHybridReason);
  for (const reason of record.scoreResult.reasons) {
    if (isHybridReason(reason)) continue;
    const reasons = reasonsByComponent.get(reason.component) ?? [];
    reasons.push(reason);
    reasonsByComponent.set(reason.component, reasons);
  }

  const bullets: RecommendationExplanationBullet[] = (
    Object.entries(record.scoreResult.components) as Array<
      [RecommendationScoreComponentName, number]
    >
  )
    .map(([component, score]) => ({
      component,
      score,
      weight: DEFAULT_RECOMMENDATION_WEIGHTS[component],
      contribution: score * DEFAULT_RECOMMENDATION_WEIGHTS[component],
      reason: reasonsByComponent.get(component)?.[0],
    }))
    .filter((entry): entry is typeof entry & { reason: RecommendationReason } =>
      Boolean(entry.reason),
    )
    .sort(
      (left, right) =>
        right.contribution - left.contribution || left.component.localeCompare(right.component),
    )
    .slice(0, 3)
    .map(({ component, score, weight, contribution, reason }) => ({
      component,
      label: COMPONENT_LABELS[component],
      score,
      weight,
      contribution,
      message: reason.message,
      evidence: reason.evidence,
    }));

  const percent = displayScore(record.scoreResult.overallScore);
  const skillBuckets = normalizeRecommendationSkillBuckets(record.scoreResult);
  const skillSummary =
    skillBuckets.matchedSkills.length > 0
      ? `${skillBuckets.matchedSkills.length} matched skill${
          skillBuckets.matchedSkills.length === 1 ? '' : 's'
        }`
      : 'No matched skills';

  return {
    summary: `${percent ?? Math.round(record.scoreResult.overallScore * 100)}% match with ${skillSummary}`,
    bullets,
    matchedSkills: skillBuckets.matchedSkills,
    aliasSkills: skillBuckets.aliasSkills,
    relatedSkills: skillBuckets.relatedSkills,
    transferableSkills: skillBuckets.transferableSkills,
    missingSkills: skillBuckets.missingSkills,
    scoreModel: {
      overallScore: record.scoreResult.overallScore,
      displayScore: percent,
      heuristicWeight: HEURISTIC_SCORE_BLEND_WEIGHT,
      retrievalWeight: RETRIEVAL_SCORE_BLEND_WEIGHT,
      heuristicScore: hybrid ? parseEvidenceNumber(hybrid.evidence, 'heuristicScore') : undefined,
      retrievalScore: hybrid ? parseEvidenceNumber(hybrid.evidence, 'retrievalScore') : undefined,
    },
  };
};
