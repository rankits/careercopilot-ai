import { beforeEach, describe, expect, it } from 'vitest';
import type { JobListDto } from '@/modules/job-listing/types/job-listing.types.js';
import {
  RECOMMENDATION_CONTEXT_SCHEMA_VERSION,
  type RecommendationContext,
} from '@/modules/recommendations/types/recommendations.types.js';
import { passesCandidateJobFilters } from '@/modules/recommendations/utils/candidate-job-filters.js';
import {
  recommendationMetricsSnapshot,
  resetRecommendationMetricsForTests,
} from '@/modules/recommendations/observability/recommendation.metrics.js';

const job = (overrides: Partial<JobListDto> = {}): JobListDto => ({
  id: 'job-1',
  title: 'Backend Engineer',
  company: {
    slug: 'good-co',
    name: 'Good Co',
    logoUrl: null,
    verified: true,
    ...overrides.company,
  },
  location: overrides.location ?? { formatted: 'Berlin, Germany', remoteType: 'HYBRID' },
  employmentType: overrides.employmentType ?? 'FULL_TIME',
  salary: overrides.salary ?? { minimum: 90000, maximum: 120000, currency: 'EUR' },
  skills: overrides.skills ?? ['TypeScript'],
  publishedAt: null,
  applyUrl: null,
  recommendationEligibility: overrides.recommendationEligibility,
});

const context = (overrides: Partial<RecommendationContext> = {}): RecommendationContext => ({
  userId: 'user-1',
  sourceType: 'TARGET_TEXT',
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
  ...overrides,
  contextSchemaVersion: overrides.contextSchemaVersion ?? RECOMMENDATION_CONTEXT_SCHEMA_VERSION,
});

describe('passesCandidateJobFilters', () => {
  beforeEach(() => {
    resetRecommendationMetricsForTests();
  });

  it('filters by location tokens, employment type, excluded company, and salary ceiling', () => {
    expect(
      passesCandidateJobFilters(
        job(),
        context({
          locations: ['Berlin'],
          employmentTypes: ['FULL_TIME'],
          salaryExpectation: { maximum: 100000, currency: 'EUR' },
        }),
      ),
    ).toBe(true);

    expect(passesCandidateJobFilters(job(), context({ locations: ['Munich'] }))).toBe(false);

    expect(passesCandidateJobFilters(job(), context({ employmentTypes: ['CONTRACT'] }))).toBe(
      false,
    );

    expect(passesCandidateJobFilters(job(), context({ excludedCompanies: ['Good Co'] }))).toBe(
      false,
    );

    expect(
      passesCandidateJobFilters(
        job({ salary: { minimum: 150000, maximum: 180000, currency: 'EUR' } }),
        context({ salaryExpectation: { maximum: 100000 } }),
      ),
    ).toBe(false);
  });

  it('defaults to strict mode and excludes jobs below the salary floor', () => {
    expect(
      passesCandidateJobFilters(
        job({ salary: { minimum: 70000, maximum: 90000, currency: 'EUR' } }),
        context({ salaryExpectation: { minimum: 100000, currency: 'EUR' } }),
      ),
    ).toBe(false);
  });

  it('keeps negotiable near-misses in flexible mode but still blocks excluded companies', () => {
    expect(
      passesCandidateJobFilters(
        job({
          location: { formatted: 'Paris, France', remoteType: 'ONSITE' },
          salary: { minimum: 70000, maximum: 90000, currency: 'EUR' },
        }),
        context({
          filterMode: 'FLEXIBLE',
          locations: ['Berlin'],
          remotePreference: 'REMOTE',
          salaryExpectation: { minimum: 100000, currency: 'EUR' },
        }),
      ),
    ).toBe(true);

    expect(
      passesCandidateJobFilters(
        job({ company: { slug: 'blocked', name: 'Blocked', logoUrl: null, verified: true } }),
        context({ filterMode: 'FLEXIBLE', excludedCompanies: ['blocked'] }),
      ),
    ).toBe(false);
  });

  it('excludes strict candidates missing required job certifications and records the exclusion', () => {
    expect(
      passesCandidateJobFilters(
        job({
          recommendationEligibility: {
            requiredCertifications: ['AWS Certified Developer'],
          },
        }),
        context({ certifications: ['AWS Cloud Practitioner'] }),
      ),
    ).toBe(false);

    expect(recommendationMetricsSnapshot().filterCertExcludeTotal).toBe(1);
  });

  it('skips certification filtering when the job has no certification metadata', () => {
    expect(passesCandidateJobFilters(job(), context({ certifications: [] }))).toBe(true);
    expect(recommendationMetricsSnapshot().filterCertExcludeTotal).toBe(0);
  });

  it('excludes strict candidates that need sponsorship when the job does not offer it', () => {
    expect(
      passesCandidateJobFilters(
        job({
          recommendationEligibility: {
            sponsorshipOffered: false,
          },
        }),
        context({ workAuthorization: 'NEEDS_SPONSORSHIP', requiresSponsorship: true }),
      ),
    ).toBe(false);
  });

  it('keeps auth and certification near-misses in flexible mode', () => {
    expect(
      passesCandidateJobFilters(
        job({
          recommendationEligibility: {
            requiredCertifications: ['Security+'],
            sponsorshipOffered: false,
          },
        }),
        context({
          filterMode: 'FLEXIBLE',
          certifications: [],
          workAuthorization: 'NEEDS_SPONSORSHIP',
        }),
      ),
    ).toBe(true);
  });
});
