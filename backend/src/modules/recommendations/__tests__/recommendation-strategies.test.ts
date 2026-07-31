import { describe, expect, it } from 'vitest';
import type { JobDetailDto } from '@/modules/job-listing/types/job-listing.types.js';
import type { CanonicalResume } from '@/modules/resumes/types/resume.types.js';
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

const resume: CanonicalResume = {
  schemaVersion: 'resume-schema-v2',
  personalInformation: {
    fullName: null,
    firstName: null,
    lastName: null,
    email: null,
    phone: null,
    location: { city: null, state: null, country: null, postalCode: null },
    links: { linkedin: null, github: null, portfolio: null, other: [] },
  },
  professionalSummary: null,
  currentPosition: { title: 'Backend Engineer', company: null },
  professionalProfile: null,
  professionalLabels: [],
  employmentHistory: [],
  projects: [],
  education: [],
  skills: {
    technical: ['TypeScript'],
    tools: [],
    frameworks: ['Express'],
    softSkills: [],
    domains: ['SaaS'],
  },
  certifications: [],
  languages: [],
  links: {
    linkedIn: null,
    github: null,
    portfolio: null,
    website: null,
    stackoverflow: null,
    leetcode: null,
    hackerrank: null,
    behance: null,
    dribbble: null,
    other: [],
  },
  awards: [],
  publications: [],
  totalExperienceMonths: 36,
  totalExperienceYears: 3,
  parseQuality: {
    overallConfidence: 1,
    requiresReview: false,
    missingImportantFields: [],
    warnings: [],
  },
};

const job: JobDetailDto = {
  id: 'job-id',
  title: 'Platform Engineer',
  company: { slug: 'acme', name: 'Acme', logoUrl: null, verified: true },
  location: { formatted: 'Remote', remoteType: 'REMOTE' },
  employmentType: 'FULL_TIME',
  salary: { minimum: 100_000, maximum: 140_000, currency: 'USD' },
  skills: ['TypeScript'],
  publishedAt: null,
  expiresAt: null,
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
    });
  });

  it('normalizes canonical resume fields', async () => {
    const context = await new ResumeSourceStrategy().buildContext({
      userId: 'user-id',
      sourceType: 'RESUME',
      sourceId: 'resume-id',
      authorizedSourcePayload: resume,
    });
    expect(context.requiredSkills).toEqual(['TypeScript', 'Express']);
    expect(context.preferredSkills).toEqual(['SaaS']);
    expect(context.targetTitles).toEqual(['Backend Engineer']);
    expect(context.yearsOfExperience).toBe(3);
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
    });
  });
});
