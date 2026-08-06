import { describe, expect, it } from 'vitest';
import { RemotiveJobMapper } from '@/modules/jobs/providers/remotive/mapper.js';
import { RemotiveJobPosting } from '@/modules/jobs/providers/remotive/types.js';
import { ProviderTier } from '@/modules/jobs/types/job.types.js';

describe('RemotiveJobMapper', () => {
  const base: RemotiveJobPosting = {
    id: 42,
    url: 'https://remotive.com/remote-jobs/software/42',
    title: 'Frontend Engineer',
    company_name: 'Fathom',
    candidate_required_location: 'Anywhere',
    publication_date: 1_785_400_000,
    description: '<p>Work &amp; grow</p>',
    tags: ['React', 'react', ' CSS '],
    category: 'Software Development',
    job_type: 'full_time',
  };

  it('maps a fully populated posting with default provider name', () => {
    const job = new RemotiveJobMapper().mapToNormalizedJob(base);

    expect(job.providerJobId).toBe('42');
    expect(job.id).toBe('42');
    expect(job.providerName).toBe('remotive');
    expect(job.providerTier).toBe(ProviderTier.PUBLIC);
    expect(job.title).toBe('Frontend Engineer');
    expect(job.companyName).toBe('Fathom');
    expect(job.applyUrl).toBe('https://remotive.com/remote-jobs/software/42');
    expect(job.location).toEqual({ raw: 'Anywhere', isRemote: true });
    expect(job.description).toBe('Work & grow');
    expect(job.tags).toEqual(['react', 'CSS', 'Software Development', 'full_time']);
    expect(job.postedAt).toBe(new Date(1_785_400_000 * 1000).toISOString());
    expect(job.canonicalHash).toHaveLength(64);
  });

  it('merges tags, category and job_type, dedupes case-insensitively', () => {
    const job = new RemotiveJobMapper().mapToNormalizedJob({
      ...base,
      tags: ['react', 'Vue', 'vue'],
      category: 'software development',
      job_type: 'FULL_TIME',
    });
    expect(job.tags).toEqual(['react', 'vue', 'software development', 'FULL_TIME']);
  });

  it('handles null tags/category/job_type and missing location', () => {
    const job = new RemotiveJobMapper().mapToNormalizedJob({
      ...base,
      tags: null,
      category: null,
      job_type: null,
      candidate_required_location: '   ',
    });
    expect(job.tags).toEqual([]);
    expect(job.location.raw).toBe('Remote');
    expect(job.location.isRemote).toBe(true);
  });

  it('maps publication_date as string date', () => {
    const job = new RemotiveJobMapper(ProviderTier.PAID_AUTH).mapToNormalizedJob(
      {
        ...base,
        publication_date: '2026-07-29T10:30:27.000Z',
      },
      'custom-provider',
    );
    expect(job.providerTier).toBe(ProviderTier.PAID_AUTH);
    expect(job.providerName).toBe('custom-provider');
    expect(job.postedAt).toBe('2026-07-29T10:30:27.000Z');
  });

  it('falls back to current time for an invalid publication date', () => {
    const job = new RemotiveJobMapper().mapToNormalizedJob({
      ...base,
      publication_date: 'invalid-date-xyz',
    });
    expect(new Date(job.postedAt).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('throws when title is missing', () => {
    const { title: _t, ...rest } = base;
    expect(() => new RemotiveJobMapper().mapToNormalizedJob(rest)).toThrowError(
      '"title" is missing',
    );
  });

  it('throws when company_name is missing', () => {
    const { company_name: _c, ...rest } = base;
    expect(() => new RemotiveJobMapper().mapToNormalizedJob(rest)).toThrowError(
      '"company_name" is missing',
    );
  });

  it('throws when url is missing', () => {
    const { url: _u, ...rest } = base;
    expect(() => new RemotiveJobMapper().mapToNormalizedJob(rest)).toThrowError('"url" is missing');
  });

  it('mapMany maps a list', () => {
    const jobs = new RemotiveJobMapper().mapMany([
      base,
      { ...base, id: '43', title: 'Backend Engineer', tags: ['Node', 'node'] },
    ]);
    expect(jobs).toHaveLength(2);
    expect(jobs[1].providerJobId).toBe('43');
  });
});
