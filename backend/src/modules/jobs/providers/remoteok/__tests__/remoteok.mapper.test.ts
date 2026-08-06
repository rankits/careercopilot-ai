import { describe, expect, it } from 'vitest';
import { RemoteOkJobMapper } from '@/modules/jobs/providers/remoteok/mapper.js';
import { RemoteOkJobPosting } from '@/modules/jobs/providers/remoteok/types.js';
import { JobSalaryPeriod, ProviderTier } from '@/modules/jobs/types/job.types.js';

describe('RemoteOkJobMapper', () => {
  const base: RemoteOkJobPosting = {
    id: 501,
    company: 'Acme',
    position: 'Engineer',
    apply_url: 'https://remoteok.com/jobs/acme-engineer',
    description: '<p>Great &amp; fun job</p>',
    tags: ['React', 'react', '  JS  '],
    location: 'Anywhere',
    date: 1_785_400_000, // number of seconds
    salary_min: 100_000,
    salary_max: 150_000,
  };

  it('maps a fully populated posting with default provider name', () => {
    const mapper = new RemoteOkJobMapper();
    const job = mapper.mapToNormalizedJob(base);

    expect(job.id).toBe('501');
    expect(job.providerJobId).toBe('501');
    expect(job.providerName).toBe('remoteok');
    expect(job.providerTier).toBe(ProviderTier.PUBLIC);
    expect(job.title).toBe('Engineer');
    expect(job.companyName).toBe('Acme');
    expect(job.normalizedTitle).toBe('engineer');
    expect(job.applyUrl).toBe('https://remoteok.com/jobs/acme-engineer');
    expect(job.location.raw).toBe('Anywhere');
    expect(job.location.isRemote).toBe(true);
    expect(job.description).toBe('Great & fun job');
    expect(job.salary).toEqual({
      min: 100_000,
      max: 150_000,
      currency: 'USD',
      period: JobSalaryPeriod.YEARLY,
    });
    expect(job.tags).toEqual(['react', 'JS']); // deduped, case-insensitive (last wins)
    expect(job.postedAt).toBe(new Date(1_785_400_000 * 1000).toISOString());
    expect(job.canonicalHash).toHaveLength(64);
  });

  it('uses slug when id is missing and url when apply_url is missing', () => {
    const { id: _id, apply_url: _applyUrl, epoch: _epoch, date: _date, ...rest } = base;
    const job = new RemoteOkJobMapper(ProviderTier.PAID_AUTH).mapToNormalizedJob(
      {
        ...rest,
        slug: 'acme-slug',
        url: 'https://remoteok.com/jobs/acme-url',
        salary_min: undefined,
        salary_max: undefined,
        location: undefined,
      } as unknown as RemoteOkJobPosting,
      'custom-provider',
    );

    expect(job.providerJobId).toBe('acme-slug');
    expect(job.providerName).toBe('custom-provider');
    expect(job.providerTier).toBe(ProviderTier.PAID_AUTH);
    expect(job.applyUrl).toBe('https://remoteok.com/jobs/acme-url');
    expect(job.location.raw).toBe('Remote'); // default location
    expect(job.location.isRemote).toBe(true);
    expect(job.salary).toBeUndefined();
    // fallback to current time when no date/epoch
    expect(new Date(job.postedAt).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('handles only min salary', () => {
    const job = new RemoteOkJobMapper().mapToNormalizedJob({
      ...base,
      salary_max: undefined,
    });
    expect(job.salary).toEqual({
      min: 100_000,
      max: undefined,
      currency: 'USD',
      period: JobSalaryPeriod.YEARLY,
    });
  });

  it('handles only max salary', () => {
    const job = new RemoteOkJobMapper().mapToNormalizedJob({
      ...base,
      salary_min: undefined,
    });
    expect(job.salary).toEqual({
      min: undefined,
      max: 150_000,
      currency: 'USD',
      period: JobSalaryPeriod.YEARLY,
    });
  });

  it('maps epoch milliseconds and empty description', () => {
    const job = new RemoteOkJobMapper().mapToNormalizedJob({
      ...base,
      epoch: 1_785_400_000_000,
      date: undefined,
      salary_min: undefined,
      salary_max: undefined,
      description: undefined,
    });
    expect(job.postedAt).toBe(new Date(1_785_400_000_000).toISOString());
    expect(job.description).toBe('');
    expect(job.salary).toBeUndefined();
  });

  it('falls back to current time on invalid date and strips html entities', () => {
    const { date: _date, epoch: _epoch, ...rest } = base;
    const job = new RemoteOkJobMapper().mapToNormalizedJob({
      ...rest,
      date: 'not-a-real-date',
      description: '<i>A&amp;B &#x26; C &#39;quoted&#39; &lt;tag&gt;</i> &nbsp;',
    });
    expect(new Date(job.postedAt).getTime()).toBeLessThanOrEqual(Date.now());
    expect(job.description).toBe("A&B & C 'quoted' <tag>");
  });

  it('throws when id and slug are missing', () => {
    const { id: _id, ...rest } = base;
    expect(() => new RemoteOkJobMapper().mapToNormalizedJob(rest)).toThrowError('"id" is missing');
  });

  it('throws when position is missing', () => {
    const { position: _p, ...rest } = base;
    expect(() => new RemoteOkJobMapper().mapToNormalizedJob(rest)).toThrowError(
      '"position" is missing',
    );
  });

  it('throws when company is missing', () => {
    const { company: _c, ...rest } = base;
    expect(() => new RemoteOkJobMapper().mapToNormalizedJob(rest)).toThrowError(
      '"company" is missing',
    );
  });

  it('throws when url and apply_url are missing', () => {
    const { apply_url: _a, ...rest } = base;
    expect(() => new RemoteOkJobMapper().mapToNormalizedJob(rest)).toThrowError('"url" is missing');
  });

  it('mapMany maps a list', () => {
    const jobs = new RemoteOkJobMapper().mapMany([
      base,
      { ...base, id: 502, position: 'Designer', tags: ['A', 'a', 'B'] },
    ]);
    expect(jobs).toHaveLength(2);
    expect(jobs[1].providerJobId).toBe('502');
    expect(jobs[1].tags).toEqual(['a', 'B']);
  });
});
