import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RECOMMENDATION_WEIGHTS,
  assignRecommendationCategory,
  assertValidRecommendationWeights,
} from '@/modules/recommendations/constants/recommendation.constants.js';
import { assertRecommendationOwnership } from '@/modules/recommendations/matching/recommendation-access.js';
import {
  createRecommendationSchema,
  recommendationFeedbackSchema,
  similarJobParamsSchema,
  targetTextBodySchema,
} from '@/modules/recommendations/validations/recommendation.schema.js';
import { RECOMMENDATION_FEEDBACK_ACTION_VALUES } from '@/modules/recommendations/types/recommendations.types.js';

const uuid = '4ea7733c-51ca-4df2-9201-72f08786d215';

describe('recommendation module invariants', () => {
  it('keeps all nine default weights totaling one', () => {
    expect(Object.keys(DEFAULT_RECOMMENDATION_WEIGHTS)).toHaveLength(9);
    expect(() => assertValidRecommendationWeights(DEFAULT_RECOMMENDATION_WEIGHTS)).not.toThrow();
    expect(
      Object.values(DEFAULT_RECOMMENDATION_WEIGHTS).reduce((sum, weight) => sum + weight, 0),
    ).toBeCloseTo(1);
    expect(DEFAULT_RECOMMENDATION_WEIGHTS).toEqual({
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
  });

  it.each([
    [1, 'BEST_MATCH'],
    [0.85, 'BEST_MATCH'],
    [0.849, 'GOOD_MATCH'],
    [0.65, 'GOOD_MATCH'],
    [0.649, 'STRETCH_OPPORTUNITY'],
    [0.45, 'STRETCH_OPPORTUNITY'],
    [0.449, 'RELATED_CAREER_PATH'],
    [0, 'RELATED_CAREER_PATH'],
  ] as const)('assigns score %s to %s', (score, category) => {
    expect(assignRecommendationCategory(score)).toBe(category);
  });

  it('allows only resources owned by the requesting user', () => {
    expect(() => assertRecommendationOwnership('user-1', { userId: 'user-1' })).not.toThrow();
    expect(() => assertRecommendationOwnership('user-1', { userId: 'user-2' })).toThrowError(
      expect.objectContaining({ statusCode: 403 }),
    );
  });

  it('validates trimmed target text and shared filters', () => {
    expect(targetTextBodySchema.parse({ targetText: '  Backend engineer  ' }).targetText).toBe(
      'Backend engineer',
    );
    expect(targetTextBodySchema.safeParse({ targetText: '   ' }).success).toBe(false);
    expect(
      targetTextBodySchema.safeParse({
        targetText: 'Engineer',
        filters: { minimumSalary: 10, maximumSalary: 5 },
      }).success,
    ).toBe(false);
    expect(
      targetTextBodySchema.safeParse({
        targetText: 'Engineer',
        filters: { minimumSalary: 5, maximumSalary: 10, workModes: ['REMOTE'] },
      }).success,
    ).toBe(true);
  });

  it('enforces sourceType and sourceId rules', () => {
    expect(createRecommendationSchema.safeParse({ body: { sourceType: 'PROFILE' } }).success).toBe(
      true,
    );
    expect(
      createRecommendationSchema.safeParse({
        body: { sourceType: 'RESUME', sourceId: uuid },
      }).success,
    ).toBe(true);
    expect(createRecommendationSchema.safeParse({ body: { sourceType: 'RESUME' } }).success).toBe(
      false,
    );
    expect(
      createRecommendationSchema.safeParse({
        body: { sourceType: 'TARGET_TEXT', sourceId: uuid },
      }).success,
    ).toBe(false);
    expect(
      createRecommendationSchema.safeParse({
        body: { sourceType: 'CAREER_GOAL', sourceId: uuid },
      }).success,
    ).toBe(false);
    expect(
      createRecommendationSchema.safeParse({
        body: { sourceType: 'SAVED_SEARCH', sourceId: uuid },
      }).success,
    ).toBe(false);
  });

  it('accepts every feedback action and rejects values outside the enum', () => {
    for (const action of RECOMMENDATION_FEEDBACK_ACTION_VALUES) {
      expect(
        recommendationFeedbackSchema.safeParse({
          body: { action },
          params: { recommendationId: uuid },
        }).success,
      ).toBe(true);
    }
    for (const action of ['HELPFUL', 'SAVE', 'DISMISS', 'LIKE', '']) {
      expect(
        recommendationFeedbackSchema.safeParse({
          body: { action },
          params: { recommendationId: uuid },
        }).success,
      ).toBe(false);
    }
  });

  it('validates similar-job UUID params and bounded limits', () => {
    expect(
      similarJobParamsSchema.safeParse({
        params: { jobId: uuid },
        query: { limit: '25' },
      }).success,
    ).toBe(true);
    expect(
      similarJobParamsSchema.safeParse({
        params: { jobId: 'not-a-uuid' },
        query: { limit: 101 },
      }).success,
    ).toBe(false);
  });
});
