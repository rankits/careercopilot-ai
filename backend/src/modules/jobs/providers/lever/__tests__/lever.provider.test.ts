import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProviderTier } from '@/modules/jobs/types/job.types.js';
import { ProviderHealthStatus } from '@/modules/jobs/types/provider.types.js';
import { LeverJobMapper } from '@/modules/jobs/providers/lever/mapper.js';
import { LeverClient } from '@/modules/jobs/providers/lever/client.js';
import { LeverJobProvider } from '@/modules/jobs/providers/lever/provider.js';

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

describe('LeverJobMapper', () => {
  it('maps a remote hosted job with all categories', () => {
    const job = new LeverJobMapper('Acme', ProviderTier.FREE_AUTH).mapToNormalizedJob(
      {
        id: 'job-1',
        text: '  Senior Engineer  ',
        hostedUrl: 'https://apply/job',
        workplaceType: 'Remote',
        createdAt: 1_900_000_000_000,
        descriptionBody: '<p>Fast <b>ship</b></p>',
        categories: {
          location: 'New York',
          department: 'Engineering',
          team: 'Core',
          commitment: 'Full-Time',
        },
      },
      'lever',
    );
    expect(job.id).toBe('job-1');
    expect(job.providerTier).toBe(ProviderTier.FREE_AUTH);
    expect(job.providerName).toBe('lever');
    expect(job.location.raw).toBe('New York');
    expect(job.location.isRemote).toBe(true);
    expect(job.description).toBe('Fast ship');
    expect(job.tags).toEqual(
      expect.arrayContaining(['Engineering', 'Core', 'Full-Time', 'Remote']),
    );
    expect(job.postedAt).toBe('2030-03-17T17:46:40.000Z');
    expect(job.canonicalHash).toHaveLength(64);
  });

  it('maps a job using allLocations and country fallbacks with applyUrl', () => {
    const job = new LeverJobMapper('Spotify').mapToNormalizedJob({
      id: 'job-2',
      text: 'Artist',
      applyUrl: 'https://apply/alt',
      categories: { location: null, allLocations: ['London'] },
      country: 'GB',
      descriptionPlain: ' plain text ',
    });
    expect(job.applyUrl).toBe('https://apply/alt');
    expect(job.location.raw).toBe('London');
    expect(job.location.country).toBe('GB');
  });

  it('maps a country-only job with remote location in country name', () => {
    const job = new LeverJobMapper('C1').mapToNormalizedJob({
      id: 'j3',
      text: 'Role',
      applyUrl: 'https://apply/x',
      categories: null,
      country: 'Remote EU',
      description: '<p>via plain description</p>',
    });
    expect(job.location.raw).toBe('Remote EU');
    expect(job.location.isRemote).toBe(true);
    expect(job.description).toBe('via plain description');
  });

  it('maps a job with no location, hosted url from categories country null, missing description', () => {
    const job = new LeverJobMapper('C2').mapToNormalizedJob({
      id: 'j4',
      text: 'Role',
      hostedUrl: 'https://apply/y',
      categories: { location: null, allLocations: null },
      country: null,
    });
    expect(job.location.raw).toBe('');
    expect(job.location.isRemote).toBe(false);
    expect(job.description).toBe('');
    expect(job.postedAt).toBeTruthy();
  });

  it('throws when required fields are missing', () => {
    const mapper = new LeverJobMapper('Acme');
    expect(() => mapper.mapToNormalizedJob({ id: ' ', text: 'T' })).toThrow(
      'Cannot map job because "id" is missing',
    );
    expect(() => mapper.mapToNormalizedJob({ id: 'x', text: ' ' })).toThrow(
      'Cannot map job because "text" is missing',
    );
    expect(() => mapper.mapToNormalizedJob({ id: 'x', text: 'T', hostedUrl: ' ' })).toThrow(
      'Cannot map job because "hostedUrl" is missing',
    );
  });

  it('maps many jobs', () => {
    const jobs = new LeverJobMapper('Acme').mapMany(
      [{ id: '1', text: 'Role', hostedUrl: 'https://apply/z' }],
      'lever',
    );
    expect(jobs).toHaveLength(1);
    expect(jobs[0].companyName).toBe('Acme');
  });
});

describe('LeverClient', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches site jobs as arrays', async () => {
    fetchMock.mockResolvedValue(createResponse([{ id: '1', text: 'Role' }]));
    const client = new LeverClient('lever', 1000);
    const jobs = await client.fetchSiteJobs('acme', true);
    expect(jobs).toHaveLength(1);
    expect(fetchMock.mock.calls[0][0]).toContain('https://api.eu.lever.co/v0/postings/acme');
    expect(fetchMock.mock.calls[0][0]).toContain('mode=json');
  });

  it('returns an empty array when the response body is not an array', async () => {
    fetchMock.mockResolvedValue(createResponse({ some: 'object' }));
    const client = new LeverClient('lever');
    const jobs = await client.fetchSiteJobs('acme');
    expect(jobs).toEqual([]);
    expect(fetchMock.mock.calls[0][0]).toContain('https://api.lever.co/v0/postings');
  });

  it('throws after retries on a non-ok response', async () => {
    fetchMock.mockResolvedValue(createResponse({}, false));
    const client = new LeverClient('lever', 1000);
    await expect(client.fetchSiteJobs('acme')).rejects.toThrow('Failed to fetch after 3 attempts');
  });

  it('throws after retries when fetch rejects', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    const client = new LeverClient('lever', 1000);
    await expect(client.fetchSiteJobs('acme')).rejects.toThrow('Failed to fetch after 3 attempts');
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
    const client = new LeverClient('lever', 5);
    await expect(client.fetchSiteJobs('acme')).rejects.toThrow('Failed to fetch after 3 attempts');
  });

  it('falls back to default timeout when timeoutMs is undefined', async () => {
    fetchMock.mockRejectedValue(new Error('boom'));
    const client = new LeverClient('lever', 1000) as unknown as { options: { timeoutMs?: number } };
    client.options.timeoutMs = undefined;
    await expect(client.fetchSiteJobs('acme')).rejects.toThrow('Failed to fetch after 3 attempts');
  });

  it('exposes health and rate limit', async () => {
    const client = new LeverClient('lever');
    expect((await client.healthCheck()).status).toBe(ProviderHealthStatus.HEALTHY);
    expect(client.getRateLimitStatus().limit).toBe(1000);
  });
});

describe('LeverJobProvider', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches across multiple sites and tolerates a failed site', async () => {
    fetchMock.mockImplementation((url: unknown) => {
      const s = String(url);
      if (s.includes('badsite')) {
        return Promise.resolve(createResponse({}, false));
      }
      return Promise.resolve(
        createResponse([
          {
            id: '1',
            text: 'Developer',
            hostedUrl: 'https://a',
            categories: { location: 'Remote' },
          },
          { id: '2', text: 'Designer', hostedUrl: 'https://b', categories: { location: 'Remote' } },
        ]),
      );
    });

    const provider = new LeverJobProvider({
      sites: [
        { site: 'acme', companyName: 'Acme' },
        { site: 'eu-site', eu: true },
      ],
      timeoutMs: 1000,
      tier: ProviderTier.FREE_AUTH,
    });
    const jobs = await provider.fetchJobs({});
    expect(jobs).toHaveLength(4);
    expect(jobs.some((j) => j.companyName === 'Acme')).toBe(true);
    const other = jobs.find((j) => j.companyName !== 'Acme');
    expect(other?.companyName).toBe('eu-site');
    expect(provider.tier).toBe(ProviderTier.FREE_AUTH);
  });

  it('uses default sites, applies filters, and health checks', async () => {
    fetchMock.mockImplementation((url: unknown) => {
      const s = String(url);
      if (s.includes('lyondell')) return Promise.resolve(createResponse({}, false));
      return Promise.resolve(createResponse([]));
    });
    const provider = new LeverJobProvider();
    const jobs = await provider.fetchJobs({ isRemote: true });
    expect(Array.isArray(jobs)).toBe(true);
    expect(provider.name).toBe('lever');
    expect(provider.tier).toBe(ProviderTier.PUBLIC);
    expect((await provider.healthCheck()).status).toBe(ProviderHealthStatus.HEALTHY);
    expect(provider.getRateLimitStatus().remaining).toBe(1000);
  });
});
