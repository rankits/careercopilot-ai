import { describe, expect, it } from 'vitest';
import { buildJobSearchWhere } from '@/modules/job-listing/utils/build-job-search-where.js';

describe('buildJobSearchWhere', () => {
  it('always constrains to ACTIVE jobs', () => {
    expect(buildJobSearchWhere({})).toEqual({ status: 'ACTIVE' });
  });

  it('applies skills with array_contains (not ignored)', () => {
    const where = buildJobSearchWhere({ skills: ['React', ' TypeScript '] });
    expect(where.AND).toEqual([
      { skills: { array_contains: ['React'] } },
      { skills: { array_contains: ['TypeScript'] } },
    ]);
  });

  it('applies location against metadata paths and remote keywords', () => {
    const where = buildJobSearchWhere({ location: 'remote' });
    expect(where.OR).toEqual(
      expect.arrayContaining([
        {
          providerMetadata: {
            path: ['locationRaw'],
            string_contains: 'remote',
          },
        },
        { remoteType: { in: ['REMOTE'] } },
      ]),
    );
  });

  it('does not accept a currency filter key (removed from contract)', () => {
    const where = buildJobSearchWhere({
      // @ts-expect-error currency intentionally removed from JobSearchFilters
      currency: 'USD',
      minSalary: 100,
    });
    expect(where).toMatchObject({
      status: 'ACTIVE',
      salaryMax: { gte: 100 },
    });
    expect(JSON.stringify(where)).not.toMatch(/currency/i);
  });

  it('applies postedSince against effectivePostedAt', () => {
    const postedSince = new Date('2026-05-03T00:00:00.000Z');
    expect(buildJobSearchWhere({ postedSince })).toEqual({
      status: 'ACTIVE',
      effectivePostedAt: { gte: postedSince },
    });
  });

  it('infers hybrid and onsite remote types from a location query', () => {
    expect(buildJobSearchWhere({ location: 'Hybrid' }).OR).toEqual(
      expect.arrayContaining([{ remoteType: { in: ['HYBRID'] } }]),
    );
    expect(buildJobSearchWhere({ location: 'on-site London' }).OR).toEqual(
      expect.arrayContaining([{ remoteType: { in: ['ONSITE'] } }]),
    );
    expect(buildJobSearchWhere({ location: 'onsite' }).OR).toEqual(
      expect.arrayContaining([{ remoteType: { in: ['ONSITE'] } }]),
    );
  });

  it('omits a remote-type clause when the location has no remote keyword', () => {
    const where = buildJobSearchWhere({ location: 'London' });
    expect(where.OR).toEqual(
      expect.not.arrayContaining([expect.objectContaining({ remoteType: expect.anything() })]),
    );
  });

  it('trims the location before matching', () => {
    const where = buildJobSearchWhere({ location: '  remote  ' });
    expect(where.OR).toEqual(
      expect.arrayContaining([
        {
          providerMetadata: {
            path: ['locationRaw'],
            string_contains: 'remote',
          },
        },
      ]),
    );
  });

  it('applies remoteTypes and employmentTypes filters', () => {
    const where = buildJobSearchWhere({
      remoteTypes: ['REMOTE'],
      employmentTypes: ['FULL_TIME', ' CONTRACT '],
    });
    expect(where.remoteType).toEqual({ in: ['REMOTE'] });
    expect(where.employmentType).toEqual({ in: ['FULL_TIME', 'CONTRACT'] });
  });

  it('accepts a single-string filter value and normalizes it', () => {
    const where = buildJobSearchWhere({ skills: '  Go ', remoteTypes: 'REMOTE' as never });
    expect(where.AND).toEqual([{ skills: { array_contains: ['Go'] } }]);
    expect(where.remoteType).toEqual({ in: ['REMOTE'] });
  });

  it('applies companySlug and a query OR block', () => {
    const where = buildJobSearchWhere({ companySlug: 'acme', query: 'engineer' });
    expect(where.companySlug).toBe('acme');
    expect(where.OR).toEqual([
      { title: { contains: 'engineer', mode: 'insensitive' } },
      { descriptionText: { contains: 'engineer', mode: 'insensitive' } },
      { company: { name: { contains: 'engineer', mode: 'insensitive' } } },
    ]);
  });

  it('applies maxSalary against salaryMin', () => {
    expect(buildJobSearchWhere({ maxSalary: 100000 })).toEqual({
      status: 'ACTIVE',
      salaryMin: { lte: 100000 },
    });
  });

  it('drops blank filter values entirely', () => {
    const where = buildJobSearchWhere({
      skills: ['  '],
      remoteTypes: [],
      employmentTypes: [''],
      location: '   ',
    });
    expect(where).toEqual({ status: 'ACTIVE' });
  });
});
