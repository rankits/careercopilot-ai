import { describe, expect, it } from 'vitest';
import type { JobListDto } from '@/modules/job-listing/types/job-listing.types.js';
import type { RecommendationContext } from '@/modules/recommendations/types/recommendations.types.js';
import { passesCandidateJobFilters } from '@/modules/recommendations/utils/candidate-job-filters.js';

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
  expiresAt: null,
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
});

describe('passesCandidateJobFilters', () => {
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
});
