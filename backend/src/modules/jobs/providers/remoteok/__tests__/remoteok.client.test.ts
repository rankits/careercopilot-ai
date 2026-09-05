import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RemoteOkClient } from '@/modules/jobs/providers/remoteok/client.js';
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

describe('RemoteOkClient', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches postings, dropping the legal notice and empty/legal-only entries', async () => {
    fetchMock.mockResolvedValueOnce(
      createResponse([
        { position: 'Legal notice', legal: 'https://legal...' },
        { position: 'Engineer', company: 'Acme', id: 1 },
        { id: 2, company: 'Only id' },
        {},
        null,
      ]),
    );

    const client = new RemoteOkClient('remoteok');
    const jobs = await client.fetchJobs();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(jobs).toEqual([
      { position: 'Engineer', company: 'Acme', id: 1 },
      { id: 2, company: 'Only id' },
    ]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://remoteok.com/api');
    expect(init.headers.Accept).toBe('application/json');
    expect(init.headers['User-Agent']).toContain('CareerCopilot');
  });

  it('uses a custom base url and returns [] when data is not an array', async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ message: 'nope' }));

    const client = new RemoteOkClient('remoteok', 'https://custom.example/jobs', 5000);
    const jobs = await client.fetchJobs();

    expect(jobs).toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith('https://custom.example/jobs', expect.anything());
  });

  it('throws ProviderFetchError on an HTTP error response', async () => {
    fetchMock.mockResolvedValue(createResponse({}, false));

    const client = new RemoteOkClient('remoteok');
    await expect(client.fetchJobs()).rejects.toMatchObject({
      providerName: 'remoteok',
      message: expect.stringContaining('Failed to fetch after 3 attempts'),
      originalError: { message: expect.stringContaining('HTTP error 500') },
    });
  });

  it('wraps a thrown Error from fetch', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    const client = new RemoteOkClient('remoteok');
    await expect(client.fetchJobs()).rejects.toMatchObject({
      providerName: 'remoteok',
      originalError: { message: expect.stringContaining('network down') },
    });
  });

  it('wraps a non-Error rejection from fetch', async () => {
    fetchMock.mockRejectedValue('boom');

    const client = new RemoteOkClient('remoteok');
    await expect(client.fetchJobs()).rejects.toMatchObject({
      providerName: 'remoteok',
      originalError: { message: expect.stringContaining('boom') },
    });
  });

  it('aborts via timeout when the request never settles', async () => {
    fetchMock.mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });
    });

    const client = new RemoteOkClient('remoteok', 'https://remoteok.com/api', 5);
    await expect(client.fetchJobs()).rejects.toMatchObject({
      providerName: 'remoteok',
      originalError: { message: expect.stringContaining('aborted') },
    });
  });

  it('retries after a transient failure and then succeeds', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('flaky'))
      .mockResolvedValueOnce(createResponse([{ position: 'Engineer', company: 'Acme', id: 1 }]));

    const client = new RemoteOkClient('remoteok');
    const jobs = await client.fetchJobs();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(jobs).toHaveLength(1);
  });

  it('fails after exhausting all retries', async () => {
    fetchMock.mockRejectedValue(new Error('always down'));

    const client = new RemoteOkClient('remoteok');
    await expect(client.fetchJobs()).rejects.toBeInstanceOf(ProviderFetchError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(client.getRateLimitStatus()).toEqual({
      remaining: 1000,
      limit: 1000,
      resetAt: undefined,
    });
  });

  it('reports health via base client', async () => {
    fetchMock.mockResolvedValueOnce(createResponse([]));
    const client = new RemoteOkClient('remoteok');
    await client.fetchJobs();
    const health = await client.healthCheck();
    expect(health.status).toBe('HEALTHY');
    expect(health.consecutiveFailures).toBe(0);
  });
});
