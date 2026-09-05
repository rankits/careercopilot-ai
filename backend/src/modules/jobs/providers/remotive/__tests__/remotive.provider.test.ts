import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RemotiveJobProvider } from '@/modules/jobs/providers/remotive/provider.js';
import { ProviderTier } from '@/modules/jobs/types/job.types.js';

vi.mock('@/modules/jobs/utils/backoff.js', () => ({
  calculateJitteredBackoff: vi.fn(() => 0),
  sleep: vi.fn(async () => {}),
}));

const createResponse = (data: unknown, ok = true) =>
  ({
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? 'OK' : 'Internal Server Error',
    json: async () => data,
  }) as Response;

describe('RemotiveJobProvider', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('has default metadata and health/status passthrough', async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        jobs: [{ id: 1, title: 'Engineer', company_name: 'Acme', url: 'https://remotive.com/1' }],
      }),
    );
    const provider = new RemotiveJobProvider();

    expect(provider.name).toBe('remotive');
    expect(provider.tier).toBe(ProviderTier.PUBLIC);
    expect(provider.isEnabled).toBe(true);

    await provider.fetchJobs({});
    const health = await provider.healthCheck();
    expect(health.status).toBe('HEALTHY');
    expect(provider.getRateLimitStatus()).toEqual({
      remaining: 1000,
      limit: 1000,
      resetAt: undefined,
    });
  });

  it('honours custom config (tier, baseUrl, timeoutMs, searches)', async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        jobs: [{ id: 1, title: 'Engineer', company_name: 'Acme', url: 'https://remotive.com/1' }],
      }),
    );
    const provider = new RemotiveJobProvider({
      tier: ProviderTier.FREE_AUTH,
      baseUrl: 'https://custom.example/jobs',
      timeoutMs: 100,
      searches: ['python'],
    });

    const jobs = await provider.fetchJobs({});
    expect(provider.tier).toBe(ProviderTier.FREE_AUTH);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].providerTier).toBe(ProviderTier.FREE_AUTH);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://custom.example/jobs?search=python',
      expect.anything(),
    );
  });

  it('applies job search filters to fetched jobs', async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        jobs: [
          {
            id: 1,
            title: 'Backend Engineer',
            company_name: 'Acme',
            url: 'https://remotive.com/1',
            candidate_required_location: 'Berlin',
          },
          {
            id: 2,
            title: 'Data Scientist',
            company_name: 'Globex',
            url: 'https://remotive.com/2',
            candidate_required_location: 'Remote',
          },
        ],
      }),
    );
    const provider = new RemotiveJobProvider({ searches: ['engineer'] });
    const jobs = await provider.fetchJobs({ company: 'acme' });
    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe('Backend Engineer');
  });
});
