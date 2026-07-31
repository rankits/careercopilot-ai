import type {
  RecommendationCategory,
  RecommendationScoreComponentName,
} from '@/modules/recommendations/types/recommendations.types.js';

export const DEFAULT_RECOMMENDATION_WEIGHTS: Readonly<
  Record<RecommendationScoreComponentName, number>
> = Object.freeze({
  requiredSkills: 0.3,
  title: 0.2,
  experience: 0.15,
  responsibilities: 0.1,
  preferredSkills: 0.05,
  location: 0.08,
  industry: 0.04,
  salary: 0.05,
  qualifications: 0.03,
});

export const assertValidRecommendationWeights = (
  weights: Readonly<Record<RecommendationScoreComponentName, number>>,
): void => {
  const entries = Object.entries(weights);
  if (entries.some(([, weight]) => !Number.isFinite(weight) || weight < 0 || weight > 1)) {
    throw new Error('Recommendation weights must be finite values between 0 and 1');
  }

  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (Math.abs(total - 1) > Number.EPSILON * 10) {
    throw new Error(`Recommendation weights must total 1; received ${total}`);
  }
};

export const assignRecommendationCategory = (score: number): RecommendationCategory => {
  if (!Number.isFinite(score) || score < 0 || score > 1) {
    throw new RangeError('Recommendation score must be between 0 and 1');
  }
  if (score >= 0.85) return 'BEST_MATCH';
  if (score >= 0.65) return 'GOOD_MATCH';
  if (score >= 0.45) return 'STRETCH_OPPORTUNITY';
  return 'RELATED_CAREER_PATH';
};
