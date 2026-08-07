import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProviderTier } from '@/modules/jobs/types/job.types.js';
import { ProviderHealthStatus } from '@/modules/jobs/types/provider.types.js';
import { HimalayasJobMapper } from '@/modules/jobs/providers/himalayas/mapper.js';
import { HimalayasClient } from '@/modules/jobs/providers/himalayas/client.js';
import { HimalayasJobProvider } from '@/modules/jobs/providers/himalayas/provider.js';

vi.mock('@/modules/jobs/utils/backoff.js', () => ({
  calculateJitteredBackoff: vi.fn(() => 0),
  sleep: vi.fn(() => Promise.resolve()),
}));

const createResponse = (data: unknown, ok = true) =>
  ({
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? 'OK' : 'Internal Server Error',
    json: async () => data,
  }) as Response;

const fullJob = {
  guid: 'g-full',
  title: 'Fullstack Dev',
  companyName: 'Acme',
  description: '<p>Hello <b>world</b></p>',
  excerpt: 'fallback',
  minSalary: 50,
  maxSalary: 100,
  currency: 'GBP',
  salaryPeriod: 'hourly',
  employmentType: 'Full-time',
  seniority: ['senior', 'lead'],
  categories: ['Engineering'],
  parentCategories: ['Tech'],
  timezoneRestrictions: ['US'],
  locationRestrictions: ['Berlin', 'Germany'],
  pubDate: 1_900_000_000_000,
  applicationLink: 'https://apply.example',
};

describe('HimalayasJobMapper', () => {
  it('maps a full job with restrictions and salary', () => {
    const job = new HimalayasJobMapper(ProviderTier.FREE_AUTH).mapToNormalizedJob(
      fullJob,
      'himalayas',
    );
    expect(job.id).toBe('g-full');
    expect(job.providerTier).toBe(ProviderTier.FREE_AUTH);
    expect(job.location.raw).toBe('Berlin, Germany');
    expect(job.location.country).toBe('Berlin');
    expect(job.description).toBe('Hello world');
    expect(job.applyUrl).toBe('https://apply.example');
    expect(job.salary).toMatchObject({ min: 50, max: 100, currency: 'GBP', period: 'HOURLY' });
    expect(job.postedAt).toBe('2030-03-17T17:46:40.000Z');
    expect(job.tags).toEqual(
      expect.arrayContaining(['Engineering', 'Tech', 'senior', 'lead', 'Full-time', 'US']),
    );
    expect(job.canonicalHash).toHaveLength(64);
  });

  it('maps a minimal job using defaults and remote worldwide location', () => {
    const job = new HimalayasJobMapper().mapToNormalizedJob({
      guid: 'g-min',
      title: 'Engineer',
      companyName: 'Startup',
      excerpt: '<p>Only excerpt</p>',
      pubDate: '2024-01-15T00:00:00.000Z',
    });
    expect(job.providerName).toBe('himalayas');
    expect(job.location.raw).toBe('Remote Worldwide');
    expect(job.location.isRemote).toBe(true);
    expect(job.description).toBe('Only excerpt');
    expect(job.salary).toBeUndefined();
    expect(job.postedAt).toBe('2024-01-15T00:00:00.000Z');
    expect(job.canonicalHash).toHaveLength(64);
  });

  it('handles no description or excerpt and no pubDate', () => {
    const job = new HimalayasJobMapper().mapToNormalizedJob({
      guid: 'g-2',
      title: 'T',
      companyName: 'C',
    });
    expect(job.description).toBe('');
    expect(job.postedAt).toBeTruthy();
  });

  it('handles seniority as a single string and no employment type', () => {
    const job = new HimalayasJobMapper().mapToNormalizedJob({
      guid: 'g-3',
      title: 'T',
      companyName: 'C',
      seniority: 'mid',
      categories: null,
      parentCategories: null,
      timezoneRestrictions: null,
      applicationLink: null,
      minSalary: 10,
      currency: null,
      salaryPeriod: 'month',
    });
    expect(job.location.raw).toBe('Remote Worldwide');
    expect(job.tags).toContain('mid');
    expect(job.applyUrl).toBe('g-3');
    expect(job.salary).toMatchObject({
      min: 10,
      max: undefined,
      currency: 'USD',
      period: 'MONTHLY',
    });
  });

  it('handles salary when only maxSalary is present', () => {
    const job = new HimalayasJobMapper().mapToNormalizedJob({
      guid: 'g-4',
      title: 'T',
      companyName: 'C',
      maxSalary: 90,
    });
    expect(job.salary).toMatchObject({
      min: undefined,
      max: 90,
      currency: 'USD',
      period: 'YEARLY',
    });
  });

  it('throws when required fields are missing', () => {
    const mapper = new HimalayasJobMapper();
    expect(() => mapper.mapToNormalizedJob({ guid: ' ', title: 'T', companyName: 'C' })).toThrow(
      'Cannot map job because "guid" is missing',
    );
    expect(() => mapper.mapToNormalizedJob({ guid: 'g', title: '', companyName: 'C' })).toThrow(
      'Cannot map job because "title" is missing',
    );
    expect(() => mapper.mapToNormalizedJob({ guid: 'g', title: 'T', companyName: '  ' })).toThrow(
      'Cannot map job because "companyName" is missing',
    );
    expect(() =>
      mapper.mapToNormalizedJob({
        guid: 'g',
        title: 'T',
        companyName: 'C',
        applicationLink: '   ',
      }),
    ).toThrow('Cannot map job because "applicationLink" is missing');
  });
});

describe('HimalayasClient', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches browse and searches and dedupes by guid', async () => {
    const jobA = { guid: 'a', title: 'A', companyName: 'CA' };
    const jobB = { guid: 'b', title: 'B', companyName: 'CB' };
    const jobA2 = { guid: 'a', title: 'A2', companyName: 'CA2' };
    fetchMock.mockResolvedValueOnce(createResponse({ jobs: [jobA] }));
    fetchMock.mockResolvedValueOnce(createResponse({ jobs: [jobA2] }));
    fetchMock.mockResolvedValueOnce(createResponse({ jobs: [jobB] }));
    fetchMock.mockResolvedValueOnce(createResponse({}));

    const client = new HimalayasClient(
      'himalayas',
      'https://browse',
      'https://search',
      5000,
      { limit: 5, offset: 2 },
      [{ q: 'engineer', country: 'India' }, { country: 'US' }],
    );
    const jobs = await client.fetchJobs();

    expect(jobs).toHaveLength(2);
    expect(jobs.map((j) => j.guid).sort()).toEqual(['a', 'b']);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const urls = fetchMock.mock.calls.map((c) => c[0] as string);
    expect(urls[0]).toContain('limit=5');
    expect(urls[0]).toContain('offset=2');
    expect(urls[1]).toContain('q=engineer');
    expect(urls[1]).toContain('country=India');
    expect(urls[2]).toContain('country=US');
    expect(urls[2]).not.toContain('q=');
  });

  it('uses default query params when browse config is empty', async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ jobs: [] }));
    const client = new HimalayasClient(
      'himalayas',
      'https://browse',
      'https://search',
      5000,
      {},
      [],
    );
    await client.fetchJobs();
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('limit=40');
    expect(url).toContain('offset=0');
  });

  it('throws ProviderFetchError on non-ok response and rethrows after retries', async () => {
    fetchMock.mockResolvedValue(createResponse({ jobs: [] }, false));
    const client = new HimalayasClient(
      'himalayas',
      'https://browse',
      'https://search',
      5000,
      {},
      [],
    );
    await expect(client.fetchJobs()).rejects.toThrow('Failed to fetch after 3 attempts');
  });

  it('wraps a rejected fetch into ProviderFetchError', async () => {
    fetchMock.mockRejectedValue('boom');
    const client = new HimalayasClient(
      'himalayas',
      'https://browse',
      'https://search',
      5000,
      {},
      [],
    );
    await expect(client.fetchJobs()).rejects.toThrow('Failed to fetch after 3 attempts');
  });

  it('handles responses without jobs arrays and searches without country', async () => {
    fetchMock.mockResolvedValue(createResponse({ totalCount: 2 }));
    const client = new HimalayasClient(
      'himalayas',
      'https://browse',
      'https://search',
      100,
      { limit: 1, offset: 1 },
      [{ q: 'x' }],
    );
    const jobs = await client.fetchJobs();
    expect(jobs).toHaveLength(0);
    const urls = fetchMock.mock.calls.map((c) => c[0] as string);
    expect(urls[1]).toContain('q=x');
    expect(urls[1]).not.toContain('country=');
  });

  it('aborts the request when the timeout fires', async () => {
    fetchMock.mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('The operation was aborted', 'AbortError')),
          );
        }),
    );
    const client = new HimalayasClient(
      'himalayas',
      'https://browse',
      'https://search',
      5,
      { limit: 1 },
      [],
    );
    await expect(client.fetchJobs()).rejects.toThrow('Failed to fetch after 3 attempts');
  });

  it('falls back to the default timeout when timeoutMs is undefined', async () => {
    fetchMock.mockRejectedValue('boom');
    const client = new HimalayasClient(
      'himalayas',
      'https://browse',
      'https://search',
      5,
      { limit: 1 },
      [],
    ) as unknown as {
      options: { timeoutMs?: number };
    };
    client.options.timeoutMs = undefined;
    await expect(client.fetchJobs()).rejects.toThrow('Failed to fetch after 3 attempts');
  });

  it('exposes health and rate limit status', async () => {
    const client = new HimalayasClient('himalayas');
    const health = await client.healthCheck();
    expect(health.status).toBe(ProviderHealthStatus.HEALTHY);
    expect(health.consecutiveFailures).toBe(0);
    const rate = client.getRateLimitStatus();
    expect(rate.remaining).toBe(1000);
    expect(rate.limit).toBe(1000);
  });
});

describe('HimalayasJobProvider', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches jobs and applies filters', async () => {
    const raw = [
      { guid: '1', title: 'React Engineer', companyName: 'Acme', locationRestrictions: ['Berlin'] },
      {
        guid: '2',
        title: 'Backend Engineer',
        companyName: 'Other',
        locationRestrictions: ['Remote'],
      },
      {
        guid: '3',
        title: 'Senior React Engineer',
        companyName: 'Acme',
        locationRestrictions: ['Berlin'],
        minSalary: 100,
      },
    ];
    fetchMock.mockResolvedValue(createResponse({ jobs: raw }));
    const provider = new HimalayasJobProvider({
      browseBaseUrl: 'https://browse',
      searchBaseUrl: 'https://search',
      timeoutMs: 1000,
      browse: { limit: 10 },
      searches: [],
      tier: ProviderTier.FREE_AUTH,
    });
    const jobs = await provider.fetchJobs({
      query: 'react',
      company: 'acme',
      location: 'berlin',
      minSalary: 50,
    });
    expect(jobs).toHaveLength(1);
    expect(jobs[0].id).toBe('3');
    expect(jobs[0].providerTier).toBe(ProviderTier.FREE_AUTH);
  });

  it('applies isRemote filter and health checks', async () => {
    const raw = [
      { guid: '1', title: 'React Engineer', companyName: 'Acme' },
      {
        guid: '2',
        title: 'Backend Engineer',
        companyName: 'Other',
        locationRestrictions: ['Remote'],
      },
    ];
    fetchMock.mockResolvedValue(createResponse({ jobs: raw }));
    const provider = new HimalayasJobProvider();
    const jobs = await provider.fetchJobs({ isRemote: true });
    expect(jobs.map((j) => j.id).sort()).toEqual(['1', '2']);
    const nonRemote = await provider.fetchJobs({ isRemote: false });
    expect(nonRemote).toHaveLength(0);
    const health = await provider.healthCheck();
    expect(health.status).toBe(ProviderHealthStatus.HEALTHY);
    const rate = provider.getRateLimitStatus();
    expect(rate.limit).toBe(1000);
    expect(provider.name).toBe('himalayas');
    expect(provider.tier).toBe(ProviderTier.PUBLIC);
  });
});
