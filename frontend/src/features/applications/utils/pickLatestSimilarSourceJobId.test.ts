import { describe, expect, it } from 'vitest';

import type { ApplicationDto } from '@/features/applications/types/application.types';

import { pickLatestSimilarSourceJobId } from './pickLatestSimilarSourceJobId';

const baseApplication = {
  archivedAt: null,
  closedAt: null,
  companyId: null,
  companyLogoUrl: null,
  companyName: 'Acme',
  currentStatus: 'SAVED',
  employmentType: 'FULL_TIME',
  firstResponseAt: null,
  id: 'app-1',
  interestLevel: null,
  jobTitle: 'Engineer',
  location: 'Remote',
  originalJobUrl: null,
  primarySourceType: 'PLATFORM_JOB',
  priority: 'MEDIUM',
  remoteType: 'REMOTE',
  salaryCurrency: null,
  salaryMax: null,
  salaryMin: null,
  salaryPeriod: null,
  updatedAt: '2026-07-01T00:00:00.000Z',
  userId: 'user-1',
} satisfies Omit<ApplicationDto, 'appliedAt' | 'createdAt' | 'jobId'>;

describe('pickLatestSimilarSourceJobId', () => {
  it('returns the most recently active job id', () => {
    const result = pickLatestSimilarSourceJobId([
      {
        ...baseApplication,
        appliedAt: null,
        createdAt: '2026-07-01T00:00:00.000Z',
        id: 'saved-old',
        jobId: 'job-old',
        updatedAt: '2026-07-01T00:00:00.000Z',
      },
      {
        ...baseApplication,
        appliedAt: '2026-07-20T00:00:00.000Z',
        createdAt: '2026-07-10T00:00:00.000Z',
        currentStatus: 'APPLIED',
        id: 'applied-new',
        jobId: 'job-new',
        updatedAt: '2026-07-21T00:00:00.000Z',
      },
    ]);

    expect(result).toBe('job-new');
  });

  it('ignores applications without a catalog job id', () => {
    const result = pickLatestSimilarSourceJobId([
      {
        ...baseApplication,
        appliedAt: null,
        createdAt: '2026-07-01T00:00:00.000Z',
        jobId: null,
      },
    ]);

    expect(result).toBeUndefined();
  });
});
