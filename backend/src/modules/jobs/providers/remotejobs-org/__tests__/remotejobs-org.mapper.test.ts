import { describe, expect, it } from 'vitest';
import { RemoteJobsOrgMapper } from '@/modules/jobs/providers/remotejobs-org/mapper.js';
import { RemoteJobsOrgPosting } from '@/modules/jobs/providers/remotejobs-org/types.js';
import { JobSalaryPeriod, ProviderTier } from '@/modules/jobs/types/job.types.js';

describe('RemoteJobsOrgMapper', () => {
  it('maps a fully populated posting (string company)', () => {
    const job = new RemoteJobsOrgMapper(ProviderTier.PUBLIC).mapToNormalizedJob({
      id: 'r-1',
      title: 'Remote Engineer',
      company: 'Cloud Inc',
      apply_url: 'https://remotejobs.org/jobs/r-1',
      location: 'Remote',
      posted_at: 1_900_000_000_000,
      description: '<p>Build remote</p>',
      category: 'Software',
      type: 'Full-time',
    });
    expect(job.id).toBe('r-1');
    expect(job.providerName).toBe('remotejobs_org');
    expect(job.providerTier).toBe(ProviderTier.PUBLIC);
    expect(job.companyName).toBe('Cloud Inc');
    expect(job.applyUrl).toBe('https://remotejobs.org/jobs/r-1');
    expect(job.location).toEqual({ raw: 'Remote', isRemote: true });
    expect(job.description).toBe('Build remote');
    expect(job.tags).toEqual(['Software', 'Full-time']);
    expect(job.postedAt).toBe(new Date(1_900_000_000_000).toISOString());
    expect(job.canonicalHash).toHaveLength(64);
  });

  it('maps a posting with an object company and falls back to url', () => {
    const job = new RemoteJobsOrgMapper().mapToNormalizedJob({
      id: 'r-2',
      title: 'Designer',
      company: { name: 'Design Co' },
      url: 'https://alt',
      salary_min: 40,
      salary_max: 60,
    });
    expect(job.companyName).toBe('Design Co');
    expect(job.applyUrl).toBe('https://alt');
    expect(job.salary).toEqual({
      min: 40,
      max: 60,
      currency: 'USD',
      period: JobSalaryPeriod.YEARLY,
    });
  });

  it('defaults location to Remote and omits salary when absent', () => {
    const job = new RemoteJobsOrgMapper().mapToNormalizedJob({
      id: 'r-3',
      title: 'Tester',
      company: 'X',
      apply_url: 'u',
    });
    expect(job.location.raw).toBe('Remote');
    expect(job.location.isRemote).toBe(true);
    expect(job.salary).toBeUndefined();
  });

  it('covers the always-true remote branch and empty category', () => {
    const job = new RemoteJobsOrgMapper().mapToNormalizedJob({
      id: 'r-4',
      title: 'Ops',
      company: 'Y',
      apply_url: 'u',
      location: 'Anywhere',
    });
    expect(job.location.isRemote).toBe(true);
    expect(job.tags).toEqual([]);
  });

  it('falls back to current time when posted_at is missing', () => {
    const job = new RemoteJobsOrgMapper().mapToNormalizedJob({
      id: 'r-5',
      title: 'Ops',
      company: 'Y',
      apply_url: 'u',
    });
    expect(new Date(job.postedAt).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('throws when required fields are missing', () => {
    const mapper = new RemoteJobsOrgMapper();
    expect(() =>
      mapper.mapToNormalizedJob({ id: ' ', title: 'T', company: 'C', apply_url: 'u' }),
    ).toThrow('Cannot map job because "id" is missing');
    expect(() =>
      mapper.mapToNormalizedJob({ id: '1', title: ' ', company: 'C', apply_url: 'u' }),
    ).toThrow('Cannot map job because "title" is missing');
    expect(() =>
      mapper.mapToNormalizedJob({ id: '1', title: 'T', company: ' ', apply_url: 'u' }),
    ).toThrow('Cannot map job because "company" is missing');
    expect(() => mapper.mapToNormalizedJob({ id: '1', title: 'T', company: 'C' })).toThrow(
      'Cannot map job because "apply_url" is missing',
    );
    expect(() =>
      mapper.mapToNormalizedJob({ id: '1', title: 'T', company: { name: ' ' }, apply_url: 'u' }),
    ).toThrow('Cannot map job because "company.name" is missing');
  });

  it('mapMany maps a list', () => {
    const jobs = new RemoteJobsOrgMapper().mapMany([
      { id: '1', title: 'A', company: 'C', apply_url: 'u' },
    ]);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].providerJobId).toBe('1');
  });
});
