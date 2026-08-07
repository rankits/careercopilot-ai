import { describe, expect, it } from 'vitest';
import { ArbeitnowJobMapper } from '@/modules/jobs/providers/arbeitnow/mapper.js';
import { ProviderTier } from '@/modules/jobs/types/job.types.js';
import { normalizeText, generateCanonicalHash } from '@/modules/jobs/utils/fingerprint.js';

const basePosting = {
  slug: 'senior-dev-berlin',
  company_name: '  Acme Corp  ',
  title: '  Senior Developer  ',
  description:
    '<script>bad()</script><style>.x{}</style><p>Hello &amp; goodbye&nbsp;<b>world</b></p>&quot;x&quot;&#39;y&#39;&#x26;z',
  remote: false,
  url: 'https://apply.test/job',
  tags: ['Backend', '  backend  '],
  job_types: ['Full-Time', ''],
  location: 'Berlin, Germany',
  created_at: 1_700_000_000,
};

describe('ArbeitnowJobMapper', () => {
  it('maps a full posting to a normalized job', () => {
    const job = new ArbeitnowJobMapper().mapToNormalizedJob(basePosting);
    expect(job.id).toBe('senior-dev-berlin');
    expect(job.providerJobId).toBe('senior-dev-berlin');
    expect(job.providerName).toBe('arbeitnow');
    expect(job.providerTier).toBe(ProviderTier.PUBLIC);
    expect(job.title).toBe('Senior Developer');
    expect(job.normalizedTitle).toBe('seniordeveloper');
    expect(job.companyName).toBe('Acme Corp');
    expect(job.normalizedCompany).toBe('acmecorp');
    expect(job.location).toEqual({ raw: 'Berlin, Germany', city: 'Berlin', isRemote: false });
    expect(job.description).toBe('Hello & goodbye world "x"\'y\'&z');
    expect(job.applyUrl).toBe('https://apply.test/job');
    expect(job.tags).toEqual(['backend', 'Full-Time', 'onsite', 'arbeitnow']);
    expect(job.postedAt).toBe('2023-11-14T22:13:20.000Z');
    expect(job.canonicalHash).toHaveLength(64);
  });

  it('maps a posting with remote true, ms timestamp and custom provider name', () => {
    const posting = {
      slug: 'remote-1',
      company_name: 'Remote Co',
      title: 'Remote Dev',
      url: 'https://example.com/r',
      remote: true,
      location: 'Anywhere',
      created_at: 1_700_000_000_000,
    };
    const job = new ArbeitnowJobMapper(ProviderTier.FREE_AUTH).mapToNormalizedJob(
      posting,
      'custom',
    );
    expect(job.location.isRemote).toBe(true);
    expect(job.tags).toEqual(['remote', 'custom']);
    expect(job.postedAt).toBe('2023-11-14T22:13:20.000Z');
    expect(job.providerTier).toBe(ProviderTier.FREE_AUTH);
  });

  it('handles missing location, tags, job_types, created_at and invalid date', () => {
    const posting = {
      slug: 'x',
      company_name: 'Co',
      title: 'T',
      url: 'https://example.com/x',
      created_at: 'not-a-date',
    };
    const job = new ArbeitnowJobMapper().mapToNormalizedJob(posting);
    expect(job.location).toEqual({ raw: '', city: undefined, isRemote: false });
    expect(job.tags).toEqual(['onsite', 'arbeitnow']);
    expect(job.postedAt).toBeTruthy();
    expect(job.canonicalHash).toHaveLength(64);
  });

  it('throws when required fields are missing', () => {
    const mapper = new ArbeitnowJobMapper();
    expect(() =>
      mapper.mapToNormalizedJob({ slug: ' ', title: 'T', company_name: 'C', url: 'u' }),
    ).toThrow('"slug" is missing');
    expect(() =>
      mapper.mapToNormalizedJob({ slug: 's', title: '', company_name: 'C', url: 'u' }),
    ).toThrow('"title" is missing');
    expect(() =>
      mapper.mapToNormalizedJob({ slug: 's', title: 'T', company_name: '  ', url: 'u' }),
    ).toThrow('"company_name" is missing');
    expect(() =>
      mapper.mapToNormalizedJob({ slug: 's', title: 'T', company_name: 'C', url: null as never }),
    ).toThrow('"url" is missing');
  });

  it('handles numeric NaN created_at and yields a fresh timestamp', () => {
    const job = new ArbeitnowJobMapper().mapToNormalizedJob({
      slug: 'n',
      title: 'T',
      company_name: 'C',
      url: 'u',
      created_at: Number.NaN,
    });
    expect(job.postedAt).toBeTruthy();
  });

  it('strips html entirely when only markup remains', () => {
    const job = new ArbeitnowJobMapper().mapToNormalizedJob({
      slug: 'h',
      title: 'T',
      company_name: 'C',
      url: 'u',
      description: '<p>  </p>',
    });
    expect(job.description).toBe('');
  });

  it('mapMany maps an array of postings', () => {
    const jobs = new ArbeitnowJobMapper().mapMany([
      basePosting,
      { slug: '2', title: 'T2', company_name: 'C2', url: 'u2' },
    ]);
    expect(jobs).toHaveLength(2);
    expect(jobs[1].id).toBe('2');
  });
});

describe('Fingerprint helpers used by the mapper', () => {
  it('normalizeText lowercases and strips non-alphanumerics', () => {
    expect(normalizeText('  Senior .NET/C# Dev!  ')).toBe('seniornetcdev');
    expect(normalizeText('')).toBe('');
  });

  it('generates canonical hash with and without city and remote flag', () => {
    const withCityRemote = generateCanonicalHash('Acme', 'Dev', 'Berlin', true);
    expect(withCityRemote).toHaveLength(64);
    const withCityOnsite = generateCanonicalHash('Acme', 'Dev', 'Berlin');
    expect(withCityOnsite).toHaveLength(64);
    const noCity = generateCanonicalHash('Acme', 'Dev');
    expect(noCity).toHaveLength(64);
    expect(withCityRemote).not.toBe(withCityOnsite);
    expect(withCityOnsite).not.toBe(noCity);
  });
});
