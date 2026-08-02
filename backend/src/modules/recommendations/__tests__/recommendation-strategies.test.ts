import { describe, expect, it } from 'vitest';
import type { JobDetailDto } from '@/modules/job-listing/types/job-listing.types.js';
import {
  CareerGoalSourceStrategy,
  JobSourceStrategy,
  ProfileSourceStrategy,
  ResumeSourceStrategy,
  SavedSearchSourceStrategy,
  TargetTextSourceStrategy,
} from '@/modules/recommendations/strategies/recommendation-source.strategy.js';
import { RecommendationStrategyResolver } from '@/modules/recommendations/strategies/recommendation-strategy.resolver.js';
import { RECOMMENDATION_ERROR_CODES } from '@/modules/recommendations/errors/recommendation.error.js';
import { RECOMMENDATION_CONTEXT_SCHEMA_VERSION } from '@/modules/recommendations/types/recommendations.types.js';

const job: JobDetailDto = {
  id: 'job-id',
  title: 'Platform Engineer',
  company: { slug: 'acme', name: 'Acme', logoUrl: null, verified: true },
  location: { formatted: 'Remote', remoteType: 'REMOTE' },
  employmentType: 'FULL_TIME',
  salary: { minimum: 100_000, maximum: 140_000, currency: 'USD' },
  skills: ['TypeScript'],
  publishedAt: null,
  applyUrl: null,
  descriptionHtml: '<p>Platform work</p>',
  descriptionText: 'Platform work',
  benefits: [],
  tags: ['platform'],
  companyIndustry: 'Technology',
  companySize: null,
};

describe('recommendation source strategies', () => {
  it('resolves every source type and rejects unconfigured or missing strategies', () => {
    const profile = new ProfileSourceStrategy();
    const strategies = [
      profile,
      new ResumeSourceStrategy(),
      new JobSourceStrategy(),
      new TargetTextSourceStrategy(),
      new CareerGoalSourceStrategy(),
      new SavedSearchSourceStrategy(),
    ];
    const resolver = new RecommendationStrategyResolver(strategies);
    expect(resolver.resolve('PROFILE')).toBe(profile);
    for (const sourceType of [
      'PROFILE',
      'RESUME',
      'JOB',
      'TARGET_TEXT',
      'CAREER_GOAL',
      'SAVED_SEARCH',
    ] as const) {
      expect(resolver.resolve(sourceType).supports(sourceType)).toBe(true);
    }
    expect(() => new RecommendationStrategyResolver([profile]).resolve('JOB')).toThrowError(
      expect.objectContaining({ code: RECOMMENDATION_ERROR_CODES.SOURCE_NOT_SUPPORTED }),
    );
    expect(() => resolver.resolve()).toThrowError(
      expect.objectContaining({ code: RECOMMENDATION_ERROR_CODES.SOURCE_NOT_FOUND }),
    );
  });

  it('normalizes an authorized profile payload', async () => {
    const context = await new ProfileSourceStrategy().buildContext({
      userId: 'user-id',
      sourceType: 'PROFILE',
      authorizedSourcePayload: {
        requiredSkills: ['Node.js'],
        targetTitles: ['Backend Engineer'],
      },
    });
    expect(context).toMatchObject({
      userId: 'user-id',
      sourceType: 'PROFILE',
      requiredSkills: ['Node.js'],
      targetTitles: ['Backend Engineer'],
      relatedTitles: [],
      preferredSkills: [],
      industries: [],
      locations: [],
      employmentTypes: [],
      salaryExpectation: {},
      education: [],
      certifications: [],
      excludedCompanies: [],
      excludedSkills: [],
      contextSchemaVersion: RECOMMENDATION_CONTEXT_SCHEMA_VERSION,
    });
  });

  it('normalizes mapped resume profile payloads', async () => {
    const context = await new ResumeSourceStrategy().buildContext({
      userId: 'user-id',
      sourceType: 'RESUME',
      sourceId: 'resume-id',
      authorizedSourcePayload: {
        targetTitles: ['Backend Engineer'],
        requiredSkills: ['TypeScript', 'Express'],
        preferredSkills: ['SaaS'],
        yearsOfExperience: 3,
        relatedTitles: [],
        industries: [],
        locations: [],
        employmentTypes: [],
        salaryExpectation: {},
        education: [],
        certifications: [],
        excludedCompanies: [],
        excludedSkills: [],
      },
    });
    expect(context.requiredSkills).toEqual(['TypeScript', 'Express']);
    expect(context.preferredSkills).toEqual(['SaaS']);
    expect(context.targetTitles).toEqual(['Backend Engineer']);
    expect(context.yearsOfExperience).toBe(3);
    expect(context.contextSchemaVersion).toBe(RECOMMENDATION_CONTEXT_SCHEMA_VERSION);
  });

  it('normalizes a job DTO without retrieving or scoring', async () => {
    const context = await new JobSourceStrategy().buildContext({
      userId: 'user-id',
      sourceType: 'JOB',
      sourceId: 'job-id',
      authorizedSourcePayload: job,
    });
    expect(context).toMatchObject({
      sourceType: 'JOB',
      targetTitles: ['Platform Engineer'],
      locations: ['Remote'],
      requiredSkills: ['TypeScript'],
      contextSchemaVersion: RECOMMENDATION_CONTEXT_SCHEMA_VERSION,
    });
  });

  it('keeps full-engine context fields optional but available for career goals', async () => {
    const context = await new CareerGoalSourceStrategy().buildContext({
      userId: 'user-id',
      sourceType: 'CAREER_GOAL',
      sourceId: 'goal-id',
      authorizedSourcePayload: {
        targetTitles: ['Engineering Manager'],
        requiredSkills: ['Leadership'],
        careerLevel: 'MANAGER',
        filterMode: 'FLEXIBLE',
        goalIntent: {
          currentRole: 'Senior Engineer',
          targetRole: 'Engineering Manager',
          summary: 'Move into people leadership',
          targetIndustries: ['SaaS'],
          timeframe: '12 months',
        },
        workAuthorizationRequirement: {
          status: 'AUTHORIZED',
          eligibleCountries: ['US'],
          requiresSponsorship: false,
        },
      },
    });

    expect(context).toMatchObject({
      sourceType: 'CAREER_GOAL',
      sourceId: 'goal-id',
      targetTitles: ['Engineering Manager'],
      careerLevel: 'MANAGER',
      filterMode: 'FLEXIBLE',
      goalIntent: {
        targetRole: 'Engineering Manager',
        targetIndustries: ['SaaS'],
      },
      workAuthorizationRequirement: {
        status: 'AUTHORIZED',
        eligibleCountries: ['US'],
        requiresSponsorship: false,
      },
      contextSchemaVersion: RECOMMENDATION_CONTEXT_SCHEMA_VERSION,
    });
  });

  it('keeps saved-search snapshots typed and defaults missing snapshot arrays', async () => {
    const context = await new SavedSearchSourceStrategy().buildContext({
      userId: 'user-id',
      sourceType: 'SAVED_SEARCH',
      sourceId: 'search-id',
      authorizedSourcePayload: {
        targetTitles: ['Backend Engineer'],
        requiredSkills: ['TypeScript'],
        savedSearchCriteriaVersion: 'criteria-v1',
        savedSearchSnapshot: {
          searchId: 'search-id',
          criteriaVersion: 'criteria-v1',
          query: 'backend typescript',
          filters: {
            titles: ['Backend Engineer'],
            locations: ['Remote'],
            employmentTypes: ['FULL_TIME'],
            industries: ['SaaS'],
          },
        },
      },
    });

    expect(context.savedSearchSnapshot).toEqual({
      searchId: 'search-id',
      criteriaVersion: 'criteria-v1',
      query: 'backend typescript',
      filters: {
        titles: ['Backend Engineer'],
        locations: ['Remote'],
        remotePreference: undefined,
        employmentTypes: ['FULL_TIME'],
        industries: ['SaaS'],
        minimumSalary: undefined,
        maximumSalary: undefined,
        currency: undefined,
      },
    });
  });
});
