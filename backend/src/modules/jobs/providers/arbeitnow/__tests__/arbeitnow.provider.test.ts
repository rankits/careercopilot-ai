import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArbeitnowJobProvider } from '@/modules/jobs/providers/arbeitnow/provider.js';
import { ProviderTier } from '@/modules/jobs/types/job.types.js';
import { ProviderHealthStatus } from '@/modules/jobs/types/provider.types.js';

const createResponse = (data: unknown, ok = true) =>
  ({
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? 'OK' : 'Internal Server Error',
    json: async () => data,
  }) as Response;

const postings = () => [
  {
    slug: '1',
    title: 'React Engineer',
    company_name: 'Acme',
    description: '<p>Frontend work</p>',
    remote: false,
    url: 'https://apply.test/1',
    location: 'Berlin, DE',
    created_at: 1_700_000_000,
  },
  {
    slug: '2',
    title: 'Backend Engineer',
    company_name: 'Other',
    description: '<p>APIs</p>',
    remote: true,
    url: 'https://apply.test/2',
    location: 'Remote',
    created_at: 1_700_000_001,
  },
  {
    slug: '3',
    title: 'Senior React Dev',
    company_name: 'Acme',
    description: '<p>More frontend</p>',
    remote: false,
    url: 'https://apply.test/3',
    location: 'Berlin',
    created_at: 1_700_000_002,
  },
];

describe('ArbeitnowJobProvider', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults to PUBLIC tier and real client config', () => {
    const provider = new ArbeitnowJobProvider();
    expect(provider.name).toBe('arbeitnow');
    expect(provider.tier).toBe(ProviderTier.PUBLIC);
    expect(provider.isEnabled).toBe(true);
  });

  it('honours a custom tier and base URL', async () => {
    fetchMock.mockResolvedValue(createResponse({ data: postings(), links: { next: null } }));
    const provider = new ArbeitnowJobProvider({
      baseUrl: 'https://custom.test/api',
      maxPages: 1,
      tier: ProviderTier.FREE_AUTH,
    });
    const jobs = await provider.fetchJobs({});
    expect(provider.tier).toBe(ProviderTier.FREE_AUTH);
    expect(jobs).toHaveLength(3);
    expect(fetchMock.mock.calls[0][0]).toContain('https://custom.test/api');
  });

  it('applies query, company, location and isRemote filters', async () => {
    fetchMock.mockResolvedValue(createResponse({ data: postings(), links: { next: null } }));
    const provider = new ArbeitnowJobProvider();
    const jobs = await provider.fetchJobs({
      query: 'react',
      company: 'acme',
      location: 'berlin',
      isRemote: false,
    });
    expect(jobs.map((j) => j.id)).toEqual(['1', '3']);
  });

  it('returns all jobs when no filters are provided', async () => {
    fetchMock.mockResolvedValue(createResponse({ data: postings(), links: { next: null } }));
    const provider = new ArbeitnowJobProvider();
    const jobs = await provider.fetchJobs({});
    expect(jobs).toHaveLength(3);
  });

  it('filters by isRemote true', async () => {
    fetchMock.mockResolvedValue(createResponse({ data: postings(), links: { next: null } }));
    const provider = new ArbeitnowJobProvider();
    const jobs = await provider.fetchJobs({ isRemote: true });
    expect(jobs.map((j) => j.id)).toEqual(['2']);
  });

  it('matches a location via the city segment', async () => {
    fetchMock.mockResolvedValue(createResponse({ data: [], links: { next: null } }));
    const provider = new ArbeitnowJobProvider();
    (provider as any).mapper.mapMany = vi.fn().mockReturnValue([
      {
        id: 'a',
        providerJobId: 'a',
        providerName: 'arbeitnow',
        providerTier: ProviderTier.PUBLIC,
        title: 'A',
        normalizedTitle: 'a',
        companyName: 'Acme',
        normalizedCompany: 'acme',
        location: { raw: 'Dallas', city: 'Berlin', isRemote: false },
        description: '',
        applyUrl: 'u',
        tags: [],
        postedAt: '',
        canonicalHash: 'x'.repeat(64),
      },
      {
        id: 'b',
        providerJobId: 'b',
        providerName: 'arbeitnow',
        providerTier: ProviderTier.PUBLIC,
        title: 'B',
        normalizedTitle: 'b',
        companyName: 'Acme',
        normalizedCompany: 'acme',
        location: { raw: '', city: undefined, isRemote: false },
        description: '',
        applyUrl: 'u',
        tags: [],
        postedAt: '',
        canonicalHash: 'y'.repeat(64),
      },
    ]);

    const jobs = await provider.fetchJobs({ location: 'berlin' });
    expect(jobs.map((j) => j.id)).toEqual(['a']);
  });

  it('delegates health check and rate limit status to the client', async () => {
    const provider = new ArbeitnowJobProvider();
    const health = await provider.healthCheck();
    expect(health.status).toBe(ProviderHealthStatus.HEALTHY);
    expect(health.consecutiveFailures).toBe(0);
    const status = provider.getRateLimitStatus();
    expect(status.remaining).toBe(1000);
    expect(status.limit).toBe(1000);
  });
});
