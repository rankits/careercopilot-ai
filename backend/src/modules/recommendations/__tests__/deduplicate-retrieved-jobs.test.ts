import { describe, expect, it } from 'vitest';
import type { JobListDto } from '@/modules/job-listing/types/job-listing.types.js';
import {
  canonicalRetrievedJobKey,
  deduplicateRetrievedJobs,
} from '@/modules/recommendations/utils/deduplicate-retrieved-jobs.js';

const job = (overrides: Partial<JobListDto> & { id: string }): JobListDto => ({
  id: overrides.id,
  title: overrides.title ?? 'Senior Backend Engineer',
  company: overrides.company ?? {
    slug: 'acme',
    name: 'Acme',
    logoUrl: null,
    verified: true,
  },
  location: overrides.location ?? { formatted: 'Remote', remoteType: 'REMOTE' },
  employmentType: overrides.employmentType ?? 'FULL_TIME',
  salary: overrides.salary ?? { minimum: 120000, maximum: 160000, currency: 'USD' },
  skills: overrides.skills ?? ['TypeScript', 'PostgreSQL'],
  publishedAt: overrides.publishedAt ?? null,
  applyUrl: overrides.applyUrl ?? null,
});

describe('deduplicateRetrievedJobs', () => {
  it('builds a stable public fingerprint for equivalent job rows', () => {
    expect(canonicalRetrievedJobKey(job({ id: 'job-1' }))).toBe(
      canonicalRetrievedJobKey(
        job({
          id: 'job-2',
          title: 'Senior   Backend Engineer',
          skills: ['PostgreSQL', 'TypeScript'],
        }),
      ),
    );
  });

  it('keeps the highest-scoring job per canonical retrieval key', () => {
    const result = deduplicateRetrievedJobs(
      [
        job({ id: 'job-low' }),
        job({ id: 'job-high' }),
        job({ id: 'job-distinct', title: 'Frontend Engineer', skills: ['React'] }),
      ],
      { 'job-low': 0.71, 'job-high': 0.94, 'job-distinct': 0.8 },
    );

    expect(result.jobs.map((item) => item.id)).toEqual(['job-high', 'job-distinct']);
    expect(result.retrievalScores).toEqual({ 'job-high': 0.94, 'job-distinct': 0.8 });
    expect(result.removed).toBe(1);
  });
});
