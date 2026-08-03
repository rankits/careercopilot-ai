import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RECOMMENDATION_WEIGHTS,
  assignRecommendationCategory,
  assertValidRecommendationWeights,
} from '@/modules/recommendations/constants/recommendation.constants.js';
import { assertRecommendationOwnership } from '@/modules/recommendations/matching/recommendation-access.js';
import {
  createSavedSearchSchema,
  createCareerTargetSchema,
  createRecommendationSchema,
  generateSavedSearchSchema,
  listCareerTargetsSchema,
  listRecommendationsSchema,
  listSavedSearchesSchema,
  recommendationFeedbackSchema,
  recommendationRunDetailsSchema,
  refreshRecommendationSchema,
  similarJobParamsSchema,
  targetTextBodySchema,
  updateSavedSearchSchema,
  careerTargetDetailsSchema,
} from '@/modules/recommendations/validations/recommendation.schema.js';
import {
  RECOMMENDATION_FEEDBACK_ACTION_VALUES,
  type ScoredJobRecommendation,
} from '@/modules/recommendations/types/recommendations.types.js';
import { sortRecommendationsForRanking } from '@/modules/recommendations/utils/recommendation-ranking.js';
import { defaultMatchTypeClassifier } from '@/modules/recommendations/scoring/default-match-type.classifier.js';

const uuid = '4ea7733c-51ca-4df2-9201-72f08786d215';

const scored = (
  id: string,
  overallScore: number,
  matchType: ScoredJobRecommendation['matchType'],
): ScoredJobRecommendation => ({
  job: {
    id,
    title: 'Engineer',
    company: { slug: 'acme', name: 'Acme', logoUrl: null, verified: true },
    location: { formatted: 'Remote', remoteType: 'REMOTE' },
    employmentType: 'FULL_TIME',
    salary: { minimum: null, maximum: null, currency: null },
    skills: [],
    publishedAt: null,
    applyUrl: null,
  },
  scoreResult: {
    overallScore,
    components: {
      requiredSkills: overallScore,
      title: overallScore,
      experience: overallScore,
      responsibilities: overallScore,
      preferredSkills: overallScore,
      location: overallScore,
      industry: overallScore,
      salary: overallScore,
      qualifications: overallScore,
    },
    matchedSkills: [],
    aliasSkills: [],
    relatedSkills: [],
    transferableSkills: [],
    missingSkills: [],
    reasons: [],
  },
  category: 'GOOD_MATCH',
  matchType,
});

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

  it('sorts recommendations by score, match quality, then job id', () => {
    const ranked = sortRecommendationsForRanking([
      scored('job-c', 0.8, 'RELATED'),
      scored('job-b', 0.8, 'EXACT'),
      scored('job-a', 0.9, 'MISSING'),
      scored('job-d', 0.8, 'EXACT'),
    ]);

    expect(ranked.map((item) => item.job.id)).toEqual(['job-a', 'job-b', 'job-d', 'job-c']);
  });

  it.each([
    [
      {
        matchedSkills: ['React'],
        aliasSkills: [],
        relatedSkills: [],
        transferableSkills: [],
        missingSkills: [],
      },
      'EXACT',
    ],
    [
      {
        matchedSkills: [],
        aliasSkills: ['React'],
        relatedSkills: [],
        transferableSkills: [],
        missingSkills: [],
      },
      'ALIAS',
    ],
    [
      {
        matchedSkills: [],
        aliasSkills: [],
        relatedSkills: ['Next.js'],
        transferableSkills: [],
        missingSkills: [],
      },
      'RELATED',
    ],
    [
      {
        matchedSkills: [],
        aliasSkills: [],
        relatedSkills: [],
        transferableSkills: ['JavaScript'],
        missingSkills: [],
      },
      'TRANSFERABLE',
    ],
    [
      {
        matchedSkills: [],
        aliasSkills: [],
        relatedSkills: [],
        transferableSkills: [],
        missingSkills: ['React'],
      },
      'MISSING',
    ],
  ] satisfies Array<
    [
      Pick<
        ScoredJobRecommendation['scoreResult'],
        'matchedSkills' | 'aliasSkills' | 'relatedSkills' | 'transferableSkills' | 'missingSkills'
      >,
      ScoredJobRecommendation['matchType'],
    ]
  >)('classifies graph skill buckets as %s -> %s', (skills, matchType) => {
    const item = scored('job-match-type', 0.95, 'MISSING');
    expect(
      defaultMatchTypeClassifier.classify(
        {
          userId: 'user-1',
          sourceType: 'PROFILE',
          contextSchemaVersion: '1.1.0',
          targetTitles: [],
          relatedTitles: [],
          requiredSkills: [],
          preferredSkills: [],
          industries: [],
          locations: [],
          employmentTypes: [],
          salaryExpectation: {},
          education: [],
          certifications: [],
          excludedCompanies: [],
          excludedSkills: [],
        },
        item.job,
        { ...item.scoreResult, ...skills },
      ),
    ).toBe(matchType);
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
        filters: {
          minimumSalary: 5,
          maximumSalary: 10,
          workModes: ['REMOTE'],
          filterMode: 'FLEXIBLE',
        },
      }).success,
    ).toBe(true);
    expect(
      targetTextBodySchema.safeParse({
        targetText: 'Engineer',
        filters: { filterMode: 'RELAXED' },
      }).success,
    ).toBe(false);
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
    ).toBe(true);
    expect(
      createRecommendationSchema.safeParse({
        body: { sourceType: 'CAREER_GOAL' },
      }).success,
    ).toBe(false);
    expect(
      createRecommendationSchema.safeParse({
        body: { sourceType: 'SAVED_SEARCH', sourceId: uuid },
      }).success,
    ).toBe(true);
    expect(
      createRecommendationSchema.safeParse({
        body: { sourceType: 'SAVED_SEARCH' },
      }).success,
    ).toBe(false);
  });

  it('defaults refresh to PROFILE and enforces run list query semantics', () => {
    expect(refreshRecommendationSchema.parse({ body: {} }).body).toEqual({
      sourceType: 'PROFILE',
    });
    expect(
      listRecommendationsSchema.parse({ query: { latestOnly: 'true', page: '2' } }).query,
    ).toMatchObject({ latestOnly: true, page: 2, limit: 20 });
    expect(
      listRecommendationsSchema.safeParse({
        query: { runId: uuid, latestOnly: 'true' },
      }).success,
    ).toBe(false);
    expect(
      recommendationRunDetailsSchema.safeParse({
        params: { runId: uuid },
        query: { page: '1', limit: '20' },
      }).success,
    ).toBe(true);
  });

  it('validates saved-search CRUD and generate payloads', () => {
    expect(
      listSavedSearchesSchema.parse({ query: { page: '2', limit: '10' } }).query,
    ).toMatchObject({ page: 2, limit: 10 });
    expect(
      createSavedSearchSchema.parse({
        body: {
          name: '  Remote TypeScript roles  ',
          query: '  Backend engineer  ',
          filters: { locations: ['Remote'] },
        },
      }).body,
    ).toMatchObject({
      name: 'Remote TypeScript roles',
      query: 'Backend engineer',
      filters: { locations: ['Remote'] },
    });
    expect(createSavedSearchSchema.safeParse({ body: { name: '' } }).success).toBe(false);
    expect(
      updateSavedSearchSchema.safeParse({ params: { savedSearchId: uuid }, body: {} }).success,
    ).toBe(false);
    expect(
      updateSavedSearchSchema.safeParse({
        params: { savedSearchId: uuid },
        body: { filters: { workModes: ['REMOTE'] } },
      }).success,
    ).toBe(true);
    expect(
      generateSavedSearchSchema.safeParse({
        params: { savedSearchId: uuid },
        body: { filters: { filterMode: 'STRICT' } },
      }).success,
    ).toBe(true);
  });

  it('validates career-target CRUD payloads', () => {
    expect(
      listCareerTargetsSchema.parse({ query: { page: '2', limit: '10' } }).query,
    ).toMatchObject({ page: 2, limit: 10 });
    expect(
      createCareerTargetSchema.parse({
        body: {
          goalText: '  Move into automation QA  ',
          structured: { targetRole: 'Automation QA Engineer' },
        },
      }).body,
    ).toMatchObject({
      goalText: 'Move into automation QA',
      structured: { targetRole: 'Automation QA Engineer' },
    });
    expect(createCareerTargetSchema.safeParse({ body: { goalText: '' } }).success).toBe(false);
    expect(
      careerTargetDetailsSchema.safeParse({
        params: { careerTargetId: uuid },
      }).success,
    ).toBe(true);
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
