import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProviderTier } from '@/modules/jobs/types/job.types.js';
import { ProviderHealthStatus } from '@/modules/jobs/types/provider.types.js';
import { JobicyJobMapper } from '@/modules/jobs/providers/jobicy/mapper.js';
import { JobicyClient } from '@/modules/jobs/providers/jobicy/client.js';
import { JobicyJobProvider } from '@/modules/jobs/providers/jobicy/provider.js';

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
  id: 101,
  url: 'https://jobicy/job/full',
  jobTitle: '  Senior Engineer  ',
  companyName: '  Acme  ',
  jobIndustry: ['software', 'tech'],
  jobType: ['Full-Time', 'Contract'],
  jobLevel: 'Senior',
  jobGeo: 'Europe',
  jobDescription: '<p>Hello <b>things</b></p>',
  pubDate: '2024-02-01T00:00:00.000Z',
  salaryMin: 60,
  salaryMax: 120,
  salaryCurrency: 'EUR',
  salaryPeriod: 'Monthly',
};

describe('JobicyJobMapper', () => {
  it('maps a full job', () => {
    const job = new JobicyJobMapper(ProviderTier.FREE_AUTH).mapToNormalizedJob(fullJob, 'jobicy');
    expect(job.id).toBe('101');
    expect(job.providerTier).toBe(ProviderTier.FREE_AUTH);
    expect(job.location.raw).toBe('Europe');
    expect(job.location.isRemote).toBe(true);
    expect(job.location.country).toBe('Europe');
    expect(job.description).toBe('Hello things');
    expect(job.salary).toMatchObject({ min: 60, max: 120, currency: 'EUR', period: 'MONTHLY' });
    expect(job.tags).toEqual(
      expect.arrayContaining(['software', 'tech', 'Full-Time', 'Contract', 'Senior']),
    );
    expect(job.postedAt).toBe('2024-02-01T00:00:00.000Z');
    expect(job.canonicalHash).toHaveLength(64);
  });

  it('maps a minimal job with string industry and defaults', () => {
    const job = new JobicyJobMapper().mapToNormalizedJob({
      id: 'abc-job',
      url: 'https://x/job',
      jobTitle: 'Engineer',
      companyName: 'Startup',
      jobIndustry: 'backend',
      jobType: null,
      jobGeo: null,
      jobExcerpt: '<p>Just excerpt</p>',
    });
    expect(job.providerName).toBe('jobicy');
    expect(job.id).toBe('abc-job');
    expect(job.location.raw).toBe('Remote');
    expect(job.location.isRemote).toBe(true);
    expect(job.description).toBe('Just excerpt');
    expect(job.salary).toBeUndefined();
    expect(job.postedAt).toBeTruthy();
  });

  it('uses salary when only max is present and no currency', () => {
    const job = new JobicyJobMapper().mapToNormalizedJob({
      id: 5,
      url: 'https://x/job',
      jobTitle: 'T',
      companyName: 'C',
      salaryMax: 90,
    });
    expect(job.salary).toMatchObject({
      min: undefined,
      max: 90,
      currency: 'USD',
      period: 'YEARLY',
    });
  });

  it('throws when required fields are missing', () => {
    const mapper = new JobicyJobMapper();
    expect(() =>
      mapper.mapToNormalizedJob({ id: 1, url: 'https://x', jobTitle: ' ', companyName: 'C' }),
    ).toThrow('Cannot map job because "jobTitle" is missing');
    expect(() =>
      mapper.mapToNormalizedJob({ id: 1, url: 'https://x', jobTitle: 'T', companyName: ' ' }),
    ).toThrow('Cannot map job because "companyName" is missing');
    expect(() =>
      mapper.mapToNormalizedJob({ id: 1, url: ' ', jobTitle: 'T', companyName: 'C' }),
    ).toThrow('Cannot map job because "url" is missing');
  });

  it('maps many jobs', () => {
    const jobs = new JobicyJobMapper().mapMany([fullJob], 'jobicy');
    expect(jobs).toHaveLength(1);
    expect(jobs[0].providerName).toBe('jobicy');
  });
});

describe('JobicyClient', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches multiple feeds and dedupes by id', async () => {
    fetchMock.mockResolvedValueOnce(
      createResponse({ jobs: [{ id: 1, jobTitle: 'A', companyName: 'C', url: 'u' }] }),
    );
    fetchMock.mockResolvedValueOnce(
      createResponse({
        jobs: [
          { id: 1, jobTitle: 'A2', companyName: 'C2', url: 'u' },
          { id: 2, jobTitle: 'B', companyName: 'C', url: 'u' },
        ],
      }),
    );

    const client = new JobicyClient('jobicy', 'https://base', 1000, [
      { count: 10, geo: 'eu', industry: 'engineering', tag: 'js' },
      { tag: 'remote' },
    ]);
    const jobs = await client.fetchJobs();
    expect(jobs.map((j) => j.id).sort()).toEqual([1, 2]);
    const urls = fetchMock.mock.calls.map((c) => c[0] as string);
    expect(urls[0]).toContain('count=10');
    expect(urls[0]).toContain('geo=eu');
    expect(urls[0]).toContain('industry=engineering');
    expect(urls[0]).toContain('tag=js');
    expect(urls[1]).toContain('tag=remote');
    expect(urls[1]).not.toContain('count=');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('uses defaults with default base url and handles response without jobs', async () => {
    fetchMock.mockResolvedValue(createResponse({}));
    const client = new JobicyClient('jobicy');
    await client.fetchJobs();
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('https://jobicy.com/api/v2/remote-jobs');
  });

  it('throws ProviderFetchError on non-ok responses', async () => {
    fetchMock.mockResolvedValue(createResponse({}, false));
    const client = new JobicyClient('jobicy', 'https://x', 1000, [{ count: 1 }]);
    await expect(client.fetchJobs()).rejects.toThrow('Failed to fetch after 3 attempts');
  });

  it('wraps a rejected fetch into ProviderFetchError', async () => {
    fetchMock.mockRejectedValue('boom');
    const client = new JobicyClient('jobicy', 'https://x', 1000, [{ count: 1 }]);
    await expect(client.fetchJobs()).rejects.toThrow('Failed to fetch after 3 attempts');
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
    const client = new JobicyClient('jobicy', 'https://x', 5, [{ count: 1 }]);
    await expect(client.fetchJobs()).rejects.toThrow('Failed to fetch after 3 attempts');
  });

  it('falls back to default base url and timeout when options are undefined', async () => {
    fetchMock.mockRejectedValue('boom');
    const client = new JobicyClient('jobicy', 'https://x', 1000, [{ count: 1 }]) as unknown as {
      options: { baseUrl?: string; timeoutMs?: number };
    };
    client.options.timeoutMs = undefined;
    client.options.baseUrl = undefined;
    await expect(client.fetchJobs()).rejects.toThrow('Failed to fetch after 3 attempts');
  });

  it('exposes health and rate limit', async () => {
    const client = new JobicyClient('jobicy');
    expect((await client.healthCheck()).status).toBe(ProviderHealthStatus.HEALTHY);
    expect(client.getRateLimitStatus().remaining).toBe(1000);
  });
});

describe('JobicyJobProvider', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches and filters jobs', async () => {
    const raw = [
      { id: 1, jobTitle: 'React Engineer', companyName: 'Acme', url: 'u1', jobGeo: 'Berlin' },
      { id: 2, jobTitle: 'Backend Engineer', companyName: 'Other', url: 'u2' },
      { id: 3, jobTitle: 'React Engineer', companyName: 'Acme', url: 'u3', salaryMin: 200 },
    ];
    fetchMock.mockResolvedValue(createResponse({ jobs: raw }));
    const provider = new JobicyJobProvider({
      baseUrl: 'https://x',
      timeoutMs: 500,
      tier: ProviderTier.FREE_AUTH,
    });
    const jobs = await provider.fetchJobs({ query: 'backend' });
    expect(jobs.map((j) => j.id)).toEqual(['2']);
    const all = await provider.fetchJobs({ company: 'acme' });
    expect(all.map((j) => j.id)).toEqual(['1', '3']);
  });

  it('health checks and reports defaults', async () => {
    fetchMock.mockResolvedValue(createResponse({ jobs: [] }));
    const provider = new JobicyJobProvider();
    await provider.fetchJobs({ isRemote: true });
    expect(provider.name).toBe('jobicy');
    expect(provider.tier).toBe(ProviderTier.PUBLIC);
    expect((await provider.healthCheck()).status).toBe(ProviderHealthStatus.HEALTHY);
    expect(provider.getRateLimitStatus().limit).toBe(1000);
  });
});
