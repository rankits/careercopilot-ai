import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RemotiveClient } from '@/modules/jobs/providers/remotive/client.js';
import { ProviderFetchError } from '@/modules/jobs/errors/ProviderFetchError.js';

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

describe('RemotiveClient', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches and dedupes jobs across searches, setting the search param', async () => {
    fetchMock
      .mockResolvedValueOnce(createResponse({ jobs: [{ id: 1, title: 'A' }] }))
      .mockResolvedValueOnce(
        createResponse({
          jobs: [
            { id: 1, title: 'A (dup)' },
            { id: 2, title: 'B' },
          ],
        }),
      )
      .mockResolvedValueOnce(createResponse({ jobs: [{ id: 3, title: 'C' }] }));

    const client = new RemotiveClient('remotive');
    const jobs = await client.fetchJobs();

    // default searches: software, India, engineer -> 3 calls
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(jobs.map((j) => j.id)).toEqual([1, 2, 3]);

    const url0 = new URL(fetchMock.mock.calls[0][0]);
    expect(url0.pathname).toBe('/api/remote-jobs');
    expect(url0.searchParams.get('search')).toBe('software');
    expect(fetchMock.mock.calls[1][1].headers.Accept).toBe('application/json');
  });

  it('skips the search param when trimmed search is empty and dedupes across responses', async () => {
    fetchMock.mockResolvedValue(createResponse({ jobs: [{ id: 1, title: 'A' }] }));

    const client = new RemotiveClient('remotive', 'https://remotive.com/api/remote-jobs', 5000, [
      '  ',
      'engineer',
    ]);
    const jobs = await client.fetchJobs();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const url0 = new URL(fetchMock.mock.calls[0][0]);
    expect(url0.searchParams.has('search')).toBe(false);
    expect(jobs.map((j) => j.id)).toEqual([1]);
  });

  it('handles an empty jobs list from the API', async () => {
    fetchMock.mockResolvedValue(createResponse({ 'job-count': 0 }));

    const client = new RemotiveClient('remotive', undefined, undefined, []);
    const jobs = await client.fetchJobs();

    expect(fetchMock).toHaveBeenCalledTimes(0);
    expect(jobs).toEqual([]);
  });

  it('throws ProviderFetchError on an HTTP error response', async () => {
    fetchMock.mockResolvedValue(createResponse({}, false));

    const client = new RemotiveClient('remotive', undefined, undefined, ['engineer']);
    await expect(client.fetchJobs()).rejects.toMatchObject({
      providerName: 'remotive',
      message: expect.stringContaining('Failed to fetch after 3 attempts'),
      originalError: { message: expect.stringContaining('HTTP error 500') },
    });
  });

  it('wraps a thrown Error from fetch', async () => {
    fetchMock.mockRejectedValue(new Error('timeout'));

    const client = new RemotiveClient('remotive', undefined, undefined, ['engineer']);
    await expect(client.fetchJobs()).rejects.toMatchObject({
      providerName: 'remotive',
      originalError: { message: expect.stringContaining('timeout') },
    });
  });

  it('wraps a non-Error rejection from fetch', async () => {
    fetchMock.mockRejectedValue('exploded');

    const client = new RemotiveClient('remotive', undefined, undefined, ['engineer']);
    await expect(client.fetchJobs()).rejects.toMatchObject({
      providerName: 'remotive',
      originalError: { message: expect.stringContaining('exploded') },
    });
  });

  it('retries after transient failure then succeeds', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('flaky'))
      .mockResolvedValue(createResponse({ jobs: [{ id: 1, title: 'A' }] }));

    const client = new RemotiveClient('remotive', undefined, undefined, ['software']);
    const jobs = await client.fetchJobs();
    expect(jobs.map((j) => j.id)).toEqual([1]);
  });

  it('fails after exhausting all retries and returns rate-limit status', async () => {
    fetchMock.mockRejectedValue(new Error('down'));

    const client = new RemotiveClient('remotive', undefined, undefined, ['software']);
    await expect(client.fetchJobs()).rejects.toBeInstanceOf(ProviderFetchError);
    expect(client.getRateLimitStatus()).toEqual({
      remaining: 1000,
      limit: 1000,
      resetAt: undefined,
    });
  });

  it('reports health via base client', async () => {
    fetchMock.mockResolvedValue(createResponse({ jobs: [] }));
    const client = new RemotiveClient('remotive', undefined, undefined, ['software']);
    await client.fetchJobs();
    const health = await client.healthCheck();
    expect(health.status).toBe('HEALTHY');
    expect(health.consecutiveFailures).toBe(0);
  });
});
