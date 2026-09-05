import { describe, expect, it } from 'vitest';
import { AshbyJobMapper } from '@/modules/jobs/providers/ashby/mapper.js';
import { AshbyJobPosting } from '@/modules/jobs/providers/ashby/types.js';
import { JobSalaryPeriod, ProviderTier } from '@/modules/jobs/types/job.types.js';

describe('AshbyJobMapper', () => {
  const base: AshbyJobPosting = {
    id: 'job-1',
    title: '  Senior Engineer  ',
    jobUrl: 'https://ashby.apply/job',
    location: 'New York',
    publishedAt: 1_900_000_000_000,
    descriptionHtml: '<p>Build <b>things</b></p>',
    department: 'Engineering',
    team: 'Core',
    employmentType: 'Full-time',
    workplaceType: 'Remote',
    isRemote: true,
  } as AshbyJobPosting;

  it('maps a fully populated posting with parsed salary and tags', () => {
    const job = new AshbyJobMapper('Acme', ProviderTier.PAID_AUTH).mapToNormalizedJob(
      {
        ...base,
        compensation: { scrapeableCompensationSalarySummary: 'USD 80,000 - 120,000 / year' },
      },
      'ashby',
    );

    expect(job.id).toBe('job-1');
    expect(job.providerName).toBe('ashby');
    expect(job.providerTier).toBe(ProviderTier.PAID_AUTH);
    expect(job.title).toBe('Senior Engineer');
    expect(job.companyName).toBe('Acme');
    expect(job.applyUrl).toBe('https://ashby.apply/job');
    expect(job.location).toEqual({ raw: 'New York', isRemote: true });
    expect(job.description).toBe('Build things');
    expect(job.salary).toEqual({
      min: 80000,
      max: 120000,
      currency: 'USD',
      period: JobSalaryPeriod.YEARLY,
    });
    expect(job.tags).toEqual(
      expect.arrayContaining(['Engineering', 'Core', 'Full-time', 'Remote']),
    );
    expect(job.postedAt).toBe(new Date(1_900_000_000_000).toISOString());
    expect(job.canonicalHash).toHaveLength(64);
  });

  it('falls back to applyUrl, secondaryLocations and compensationTierSummary', () => {
    const job = new AshbyJobMapper('Acme').mapToNormalizedJob({
      id: 'x',
      title: 'Role',
      applyUrl: 'https://alt',
      secondaryLocations: ['London'],
      workplaceType: 'On-site',
      compensation: { compensationTierSummary: '120,000 EUR' },
      descriptionPlain: ' plain ',
    });
    expect(job.applyUrl).toBe('https://alt');
    expect(job.location.raw).toBe('London');
    expect(job.location.isRemote).toBe(false);
    expect(job.salary).toEqual({
      min: 120000,
      max: 120000,
      currency: 'EUR',
      period: JobSalaryPeriod.YEARLY,
    });
    // location text is not remote, isRemote not explicitly true
  });

  it('returns undefined salary when compensation summary is empty or has no numbers', () => {
    const noSummary = new AshbyJobMapper('Acme').mapToNormalizedJob({
      ...base,
      compensation: { compensationTierSummary: 'Contact us' },
    });
    expect(noSummary.salary).toBeUndefined();

    const empty = new AshbyJobMapper('Acme').mapToNormalizedJob({
      ...base,
      compensation: { scrapeableCompensationSummary: '   ' },
    });
    expect(empty.salary).toBeUndefined();
  });

  it('defaults currency to USD when absent', () => {
    const job = new AshbyJobMapper('Acme').mapToNormalizedJob({
      ...base,
      compensation: { compensationTierSummary: '90k - 100k' },
    });
    expect(job.salary?.currency).toBe('USD');
  });

  it('falls back to current time when publishedAt is missing', () => {
    const { publishedAt: _p, ...rest } = base;
    const job = new AshbyJobMapper('Acme').mapToNormalizedJob(rest);
    expect(new Date(job.postedAt).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('throws when required fields are missing', () => {
    const mapper = new AshbyJobMapper('Acme');
    expect(() => mapper.mapToNormalizedJob({ id: ' ', title: 'T', jobUrl: 'u' })).toThrow(
      'Cannot map job because "id" is missing',
    );
    expect(() => mapper.mapToNormalizedJob({ id: '1', title: ' ', jobUrl: 'u' })).toThrow(
      'Cannot map job because "title" is missing',
    );
    expect(() => mapper.mapToNormalizedJob({ id: '1', title: 'T' })).toThrow(
      'Cannot map job because "jobUrl" is missing',
    );
  });

  it('mapMany maps a list', () => {
    const jobs = new AshbyJobMapper('Acme').mapMany([{ id: '1', title: 'Role', jobUrl: 'u' }]);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].providerJobId).toBe('1');
  });
});
