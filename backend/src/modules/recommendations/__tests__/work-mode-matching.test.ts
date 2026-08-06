import { describe, expect, it } from 'vitest';

import type { JobListDto } from '@/modules/job-listing/types/job-listing.types.js';
import { matchesWorkModePreference } from '@/modules/recommendations/utils/work-mode-matching.js';

const job = (location: JobListDto['location']): JobListDto => ({
  id: 'job-1',
  title: 'Engineer',
  company: { slug: 'acme', name: 'Acme', logoUrl: null, verified: true },
  location,
  employmentType: 'FULL_TIME',
  salary: { minimum: null, maximum: null, currency: null },
  skills: [],
  publishedAt: null,
  applyUrl: null,
});

describe('matchesWorkModePreference', () => {
  it('matches remote, hybrid, and onsite jobs by remoteType across countries', () => {
    expect(
      matchesWorkModePreference(job({ formatted: 'Remote', remoteType: 'REMOTE' }), 'REMOTE'),
    ).toBe(true);
    expect(
      matchesWorkModePreference(
        job({ formatted: 'Toronto, Canada', remoteType: 'REMOTE' }),
        'REMOTE',
      ),
    ).toBe(true);
    expect(
      matchesWorkModePreference(
        job({ formatted: 'Berlin, Germany', remoteType: 'HYBRID' }),
        'HYBRID',
      ),
    ).toBe(true);
    expect(
      matchesWorkModePreference(
        job({ formatted: 'Toronto, Canada', remoteType: 'ONSITE' }),
        'REMOTE',
      ),
    ).toBe(false);
  });
});
