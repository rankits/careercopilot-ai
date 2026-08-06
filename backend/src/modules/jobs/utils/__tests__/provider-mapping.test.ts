import { describe, expect, it } from 'vitest';
import {
  cleanRequiredString,
  cleanOptionalString,
  stripHtml,
  toIsoDate,
  isRemoteLocation,
  uniqueTags,
  mapSalaryPeriod,
  applyJobSearchFilters,
} from '@/modules/jobs/utils/provider-mapping.js';
import { JobSalaryPeriod, ProviderTier } from '@/modules/jobs/types/job.types.js';
import type { NormalizedJob } from '@/modules/jobs/models/NormalizedJob.js';

const makeJob = (overrides: Partial<NormalizedJob> = {}): NormalizedJob => ({
  id: 'id-1',
  providerJobId: 'p-1',
  providerName: 'test',
  providerTier: ProviderTier.PUBLIC,
  title: 'Senior Engineer',
  normalizedTitle: 'seniorengineer',
  companyName: 'Acme',
  normalizedCompany: 'acme',
  location: { raw: 'Remote', city: 'Remote', country: 'US', isRemote: true },
  description: 'Build reliable systems',
  applyUrl: 'https://example.test/jobs/1',
  tags: ['TypeScript'],
  postedAt: '2026-08-01T00:00:00.000Z',
  canonicalHash: 'hash-1',
  ...overrides,
});

describe('cleanRequiredString', () => {
  it('trims and returns the value', () => {
    expect(cleanRequiredString('  hello  ', 'field')).toBe('hello');
  });

  it('throws on missing or empty values', () => {
    expect(() => cleanRequiredString(undefined, 'field')).toThrow(
      'Cannot map job because "field" is missing',
    );
    expect(() => cleanRequiredString('   ', 'field')).toThrow(
      'Cannot map job because "field" is missing',
    );
  });
});

describe('cleanOptionalString', () => {
  it('returns undefined for empty values', () => {
    expect(cleanOptionalString(undefined)).toBeUndefined();
    expect(cleanOptionalString('   ')).toBeUndefined();
    expect(cleanOptionalString('')).toBeUndefined();
  });

  it('returns trimmed value', () => {
    expect(cleanOptionalString('  x ')).toBe('x');
  });
});

describe('stripHtml', () => {
  it('returns undefined for empty input', () => {
    expect(stripHtml(undefined)).toBeUndefined();
    expect(stripHtml('')).toBeUndefined();
  });

  it('strips scripts, styles, tags and decodes entities', () => {
    const html = '<script>alert(1)</script><style>.x{}</style><p>Hello&nbsp;world &amp; more</p>';
    expect(stripHtml(html)).toBe('Hello world & more');
  });

  it('decodes additional HTML entities', () => {
    expect(stripHtml('&lt;tag&gt; &quot;quoted&quot; &#39;apos&#39; &#x26;')).toBe(
      '<tag> "quoted" \'apos\' &',
    );
  });

  it('returns undefined when content is only markup', () => {
    expect(stripHtml('<b>  </b>')).toBeUndefined();
  });
});

describe('toIsoDate', () => {
  it('treats small numbers as seconds and large as milliseconds', () => {
    expect(toIsoDate(0)).toBe('1970-01-01T00:00:00.000Z');
    expect(toIsoDate(1_785_321_027)).toBe('2026-07-29T10:30:27.000Z');
    expect(toIsoDate(1_785_321_027_000)).toBe('2026-07-29T10:30:27.000Z');
  });

  it('handles invalid numbers', () => {
    expect(toIsoDate(NaN)).toBeUndefined();
    expect(toIsoDate(Number.MAX_SAFE_INTEGER)).toBeUndefined();
  });

  it('parses string dates', () => {
    expect(toIsoDate('2026-07-29T10:30:27.000Z')).toBe('2026-07-29T10:30:27.000Z');
    expect(toIsoDate('  2026-07-29T10:30:27.000Z  ')).toBe('2026-07-29T10:30:27.000Z');
    expect(toIsoDate('1785321027')).toBe('2026-07-29T10:30:27.000Z');
  });

  it('returns undefined for invalid input', () => {
    expect(toIsoDate('not-a-date')).toBeUndefined();
    expect(toIsoDate('  ')).toBeUndefined();
    expect(toIsoDate(undefined)).toBeUndefined();
    expect(toIsoDate(null)).toBeUndefined();
  });
});

describe('isRemoteLocation', () => {
  it('detects remote keywords case-insensitively', () => {
    expect(isRemoteLocation('Remote')).toBe(true);
    expect(isRemoteLocation('anywhere')).toBe(true);
    expect(isRemoteLocation('Worldwide')).toBe(true);
    expect(isRemoteLocation('Work from home')).toBe(true);
    expect(isRemoteLocation('WFH')).toBe(true);
    expect(isRemoteLocation('Berlin')).toBe(false);
    expect(isRemoteLocation(undefined)).toBe(false);
  });
});

describe('uniqueTags', () => {
  it('flattens groups, trims and dedupes case-insensitively (later casing wins)', () => {
    expect(uniqueTags(['TypeScript', ' node '], undefined, ['typescript'])).toEqual([
      'typescript',
      'node',
    ]);
  });

  it('handles empty input', () => {
    expect(uniqueTags()).toEqual([]);
    expect(uniqueTags(null, undefined, undefined)).toEqual([]);
    expect(uniqueTags([])).toEqual([]);
    expect(uniqueTags(['  ', ''])).toEqual([]);
  });
});

describe('mapSalaryPeriod', () => {
  it('maps hour/month/year keywords', () => {
    expect(mapSalaryPeriod('per hour')).toBe(JobSalaryPeriod.HOURLY);
    expect(mapSalaryPeriod('hourly')).toBe(JobSalaryPeriod.HOURLY);
    expect(mapSalaryPeriod('monthly')).toBe(JobSalaryPeriod.MONTHLY);
    expect(mapSalaryPeriod('per month')).toBe(JobSalaryPeriod.MONTHLY);
    expect(mapSalaryPeriod('yearly')).toBe(JobSalaryPeriod.YEARLY);
    expect(mapSalaryPeriod('annual')).toBe(JobSalaryPeriod.YEARLY);
    expect(mapSalaryPeriod(undefined)).toBe(JobSalaryPeriod.YEARLY);
  });
});

describe('applyJobSearchFilters', () => {
  const jobs = [
    makeJob({
      id: '1',
      providerJobId: 'p-1',
      title: 'Senior Engineer',
      companyName: 'Acme',
      description: 'Build systems',
      location: { raw: 'Berlin', city: 'Berlin', country: 'DE', isRemote: false },
    }),
    makeJob({
      id: '2',
      providerJobId: 'p-2',
      title: 'Frontend Developer',
      companyName: 'Globex',
      description: 'Remote-friendly role',
      location: { raw: 'Remote', city: 'Remote', country: undefined, isRemote: true },
    }),
    makeJob({
      id: '3',
      providerJobId: 'p-3',
      title: 'DevOps Engineer',
      companyName: 'Acme',
      description: 'Kubernetes',
      location: { raw: 'London', city: 'London', country: 'UK', isRemote: false },
      salary: { min: 120_000, max: 150_000, currency: 'USD', period: JobSalaryPeriod.YEARLY },
    }),
  ];

  it('filters by query across title, company and description', () => {
    const result = applyJobSearchFilters(jobs, { query: 'acme' });
    expect(result.map((j) => j.id)).toEqual(['1', '3']);
  });

  it('filters by company', () => {
    const result = applyJobSearchFilters(jobs, { company: 'globex' });
    expect(result.map((j) => j.id)).toEqual(['2']);
  });

  it('filters by location across raw, city and country', () => {
    const byCity = applyJobSearchFilters(jobs, { location: 'london' });
    expect(byCity.map((j) => j.id)).toEqual(['3']);

    const byCountry = applyJobSearchFilters(jobs, { location: 'uk' });
    expect(byCountry.map((j) => j.id)).toEqual(['3']);
  });

  it('filters by remote flag', () => {
    const remote = applyJobSearchFilters(jobs, { isRemote: true });
    expect(remote.map((j) => j.id)).toEqual(['2']);
    const onsite = applyJobSearchFilters(jobs, { isRemote: false });
    expect(onsite.map((j) => j.id)).toEqual(['1', '3']);
  });

  it('filters by minSalary', () => {
    const result = applyJobSearchFilters(jobs, { minSalary: 100_000 });
    expect(result.map((j) => j.id)).toEqual(['3']);
    const none = applyJobSearchFilters(jobs, { minSalary: 1_000_000 });
    expect(none).toEqual([]);
  });

  it('returns all jobs when no filters are provided', () => {
    expect(applyJobSearchFilters(jobs, {})).toHaveLength(3);
  });
});
