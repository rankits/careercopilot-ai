import { describe, expect, it } from 'vitest';
import { RecruiteeJobMapper } from '@/modules/jobs/providers/recruitee/mapper.js';
import { RecruiteeOffer } from '@/modules/jobs/providers/recruitee/types.js';
import { JobSalaryPeriod, ProviderTier } from '@/modules/jobs/types/job.types.js';

describe('RecruiteeJobMapper', () => {
  const base: RecruiteeOffer = {
    id: 42,
    title: 'Backend Engineer',
    company_name: 'Acme Corp',
    careers_apply_url: 'https://recruitee.apply/42',
    location: 'Berlin',
    published_at: 1_900_000_000_000,
    description: '<p>Backend</p>',
    requirements: '<li>Go</li>',
    salary: { min: 60, max: 90, currency: 'EUR', period: 'monthly' },
  } as RecruiteeOffer;

  it('maps a fully populated offer', () => {
    const job = new RecruiteeJobMapper('Fallback', ProviderTier.FREE_AUTH).mapToNormalizedJob(
      base,
      'recruitee',
    );
    expect(job.id).toBe('42');
    expect(job.providerJobId).toBe('42');
    expect(job.providerName).toBe('recruitee');
    expect(job.providerTier).toBe(ProviderTier.FREE_AUTH);
    expect(job.title).toBe('Backend Engineer');
    expect(job.companyName).toBe('Acme Corp');
    expect(job.applyUrl).toBe('https://recruitee.apply/42');
    expect(job.location).toEqual({
      raw: 'Berlin',
      city: undefined,
      country: undefined,
      isRemote: false,
    });
    expect(job.salary).toEqual({
      min: 60,
      max: 90,
      currency: 'EUR',
      period: JobSalaryPeriod.MONTHLY,
    });
    expect(job.description).toBe('Backend Go');
    expect(job.postedAt).toBe(new Date(1_900_000_000_000).toISOString());
    expect(job.canonicalHash).toHaveLength(64);
  });

  it('falls back to position, fallback company, careers_url and city/country', () => {
    const job = new RecruiteeJobMapper('Fallback Ltd').mapToNormalizedJob({
      id: 7,
      position: 'DevOps',
      careers_url: 'https://c',
      city: 'London',
      country: 'GB',
      remote: true,
    });
    expect(job.title).toBe('DevOps');
    expect(job.companyName).toBe('Fallback Ltd');
    expect(job.applyUrl).toBe('https://c');
    expect(job.location.raw).toBe('London, GB');
    expect(job.location.city).toBe('London');
    expect(job.location.country).toBe('GB');
    expect(job.location.isRemote).toBe(true);
    expect(job.salary).toBeUndefined();
  });

  it('derives remote from the location text and country from country_code', () => {
    const job = new RecruiteeJobMapper('F').mapToNormalizedJob({
      id: 8,
      position: 'Role',
      careers_url: 'u',
      country_code: 'NL',
      location: 'Remote EU',
    });
    expect(job.location.isRemote).toBe(true);
    expect(job.location.country).toBe('NL');
  });

  it('maps a salary with no max and default currency', () => {
    const job = new RecruiteeJobMapper('F').mapToNormalizedJob({
      id: 9,
      position: 'Role',
      careers_url: 'u',
      salary: { min: 100, max: 0, currency: '', period: 'hourly' },
    });
    expect(job?.salary).toEqual({
      min: 100,
      max: 0,
      currency: 'USD',
      period: JobSalaryPeriod.HOURLY,
    });
  });

  it('omits salary when no min or max is present', () => {
    const job = new RecruiteeJobMapper('F').mapToNormalizedJob({
      id: 10,
      position: 'Role',
      careers_url: 'u',
      salary: { min: 0, max: 0, currency: 'EUR', period: 'yearly' },
    });
    expect(job.salary).toBeUndefined();
  });

  it('falls back to current time when all date fields are absent', () => {
    const job = new RecruiteeJobMapper('F').mapToNormalizedJob({
      id: 11,
      position: 'Role',
      careers_url: 'u',
    });
    expect(new Date(job.postedAt).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('throws when required fields are missing', () => {
    expect(() =>
      new RecruiteeJobMapper('F').mapToNormalizedJob({
        id: '',
        title: 'T',
        careers_apply_url: 'u',
      } as unknown as RecruiteeOffer),
    ).toThrow('Cannot map job because "id" is missing');
    expect(() =>
      new RecruiteeJobMapper('F').mapToNormalizedJob({
        id: '1',
        title: ' ',
        careers_apply_url: 'u',
      } as unknown as RecruiteeOffer),
    ).toThrow('Cannot map job because "title" is missing');
    expect(() =>
      new RecruiteeJobMapper('F').mapToNormalizedJob({
        id: '1',
        title: 'T',
      } as unknown as RecruiteeOffer),
    ).toThrow('Cannot map job because "careers_apply_url" is missing');
  });

  it('mapMany maps a list', () => {
    const jobs = new RecruiteeJobMapper('F').mapMany([{ id: 1, position: 'A', careers_url: 'u' }]);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].providerJobId).toBe('1');
  });
});
