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
});
