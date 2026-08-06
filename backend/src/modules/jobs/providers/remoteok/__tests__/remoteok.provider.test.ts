import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RemoteOkJobProvider } from '@/modules/jobs/providers/remoteok/provider.js';
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

describe('RemoteOkJobProvider', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const job = { id: 1, position: 'Engineer', company: 'Acme', apply_url: 'https://remoteok.com/1' };

  it('has default metadata and health/status passthrough', async () => {
    fetchMock.mockResolvedValueOnce(createResponse([job]));
    const provider = new RemoteOkJobProvider();

    expect(provider.name).toBe('remoteok');
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

  it('honours custom config (tier, baseUrl, timeoutMs)', async () => {
    fetchMock.mockResolvedValueOnce(createResponse([job]));
    const provider = new RemoteOkJobProvider({
      tier: ProviderTier.FREE_AUTH,
      baseUrl: 'https://custom.example/api',
      timeoutMs: 100,
    });

    const jobs = await provider.fetchJobs({});
    expect(provider.tier).toBe(ProviderTier.FREE_AUTH);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].providerTier).toBe(ProviderTier.FREE_AUTH);
    expect(fetchMock).toHaveBeenCalledWith('https://custom.example/api', expect.anything());
  });

  it('applies job search filters to fetched jobs', async () => {
    fetchMock.mockResolvedValueOnce(
      createResponse([
        {
          id: 1,
          position: 'Backend Engineer',
          company: 'Acme',
          location: 'Berlin',
          date: 1_785_400_000,
          apply_url: 'https://remoteok.com/1',
        },
        {
          id: 2,
          position: 'Data Scientist',
          company: 'Globex',
          location: 'Remote',
          date: 1_785_400_000,
          apply_url: 'https://remoteok.com/2',
        },
      ]),
    );
    const provider = new RemoteOkJobProvider();
    const jobs = await provider.fetchJobs({ query: 'engineer' });
    expect(jobs).toHaveLength(1);
    expect(jobs[0].companyName).toBe('Acme');
  });
});
