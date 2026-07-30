import { describe, expect, it } from 'vitest';

import { jobs } from '@/constants/pages/jobFeed';
import { filterJobs } from '@/utils/jobFeed';

describe('filterJobs', () => {
  it('returns all jobs when all filters are selected', () => {
    expect(filterJobs(jobs, { experience: 'all', salary: 'all', type: 'all' })).toHaveLength(
      jobs.length,
    );
  });

  it('filters by job type', () => {
    const result = filterJobs(jobs, { experience: 'all', salary: 'all', type: 'remote' });

    expect(result.map((job) => job.company)).toEqual(['Microsoft', 'Stripe', 'Netflix']);
  });

  it('combines type, salary, and experience filters', () => {
    const result = filterJobs(jobs, {
      experience: '5-plus',
      salary: '25-plus',
      type: 'remote',
    });

    expect(result.map((job) => job.company)).toEqual(['Microsoft', 'Stripe']);
  });

  it('returns no jobs when filters do not match together', () => {
    expect(filterJobs(jobs, { experience: '5-plus', salary: 'under-15', type: 'hybrid' })).toEqual(
      [],
    );
  });
});
