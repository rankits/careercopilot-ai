import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const backoffMocks = vi.hoisted(() => ({
  calculateJitteredBackoff: vi.fn(() => 0),
  sleep: vi.fn(async () => undefined),
}));

vi.mock('@/modules/jobs/utils/backoff.js', () => backoffMocks);

import { ArbeitnowClient } from '@/modules/jobs/providers/arbeitnow/client.js';
import { ProviderFetchError } from '@/modules/jobs/errors/ProviderFetchError.js';
import { RateLimitError } from '@/modules/jobs/errors/RateLimitError.js';
import { ProviderHealthStatus } from '@/modules/jobs/types/provider.types.js';

const createResponse = (data: unknown, ok = true) =>
  ({
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? 'OK' : 'Internal Server Error',
    json: async () => data,
  }) as Response;

const posting = (slug: string) => ({ slug, title: `T-${slug}`, company_name: 'C', url: 'u' });

describe('ArbeitnowClient', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    backoffMocks.sleep.mockImplementation(async () => undefined);
    backoffMocks.calculateJitteredBackoff.mockReturnValue(0);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('fetches a single page when links.next is null', async () => {
    fetchMock.mockResolvedValueOnce(
      createResponse({ data: [posting('a')], links: { next: null } }),
    );
    const jobs = await new ArbeitnowClient('arbeitnow').fetchFeedJobs();
    expect(jobs).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('/api/job-board-api');
  });

  it('paginates across multiple pages up to maxPages', async () => {
    fetchMock
      .mockResolvedValueOnce(
        createResponse({ data: [posting('a')], links: { next: 'http://next/2' } }),
      )
      .mockResolvedValueOnce(
        createResponse({ data: [posting('b')], links: { next: 'http://next/3' } }),
      )
      .mockResolvedValueOnce(createResponse({ data: [posting('c')], links: { next: null } }));

    const jobs = await new ArbeitnowClient('p', 'https://base', 500, 3).fetchFeedJobs();
    expect(jobs).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toContain('https://base');
    expect(fetchMock.mock.calls[1][0]).toBe('http://next/2');
    expect(fetchMock.mock.calls[2][0]).toBe('http://next/3');
  });

  it('builds page URLs, adding the page param beyond the first page', () => {
    const client = new ArbeitnowClient('p', 'https://api.test/base', 500, 3);
    expect((client as any).buildPageUrl(1)).toBe('https://api.test/base');
    expect((client as any).buildPageUrl(2)).toBe('https://api.test/base?page=2');
  });

  it('stops reasonably when maxPages limits pages', async () => {
    fetchMock.mockResolvedValue(
      createResponse({ data: [posting('a')], links: { next: 'http://next/2' } }),
    );
    const jobs = await new ArbeitnowClient('p', 'https://example', 5000, 2).fetchFeedJobs();
    expect(jobs).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('handles undefined data and zero maxPages', async () => {
    fetchMock.mockResolvedValue(createResponse({ data: undefined, links: { next: null } }));
    const jobs = await new ArbeitnowClient('p', 'https://example', 5000, 0).fetchFeedJobs();
    expect(jobs).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  it('throws ProviderFetchError on HTTP error', async () => {
    fetchMock.mockResolvedValue(createResponse({}, false));
    const client = new ArbeitnowClient('p', 'https://example', 5000, 1);
    const err = await (client as any).fetchPage('http://pages/1').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProviderFetchError);
    expect((err as Error).message).toContain('HTTP error 500');
  });

  it('wraps a rejected fetch into ProviderFetchError', async () => {
    fetchMock.mockRejectedValue('boom');
    const client = new ArbeitnowClient('p', 'https://example', 5000, 1);
    await expect((client as any).fetchPage('http://pages/1')).rejects.toMatchObject({
      message: expect.stringContaining('Failed to fetch Arbeitnow jobs: boom'),
    });
  });

  it('retries on RateLimitError and succeeds on a later attempt', async () => {
    const client = new ArbeitnowClient('p', 'https://example', 5000, 1);
    let calls = 0;
    (client as any).fetchPage = async () => {
      calls += 1;
      if (calls === 1) throw new RateLimitError('p', 25);
      return { data: [posting('ok')], links: { next: null } };
    };
    const jobs = await client.fetchFeedJobs();
    expect(jobs).toHaveLength(1);
    expect(backoffMocks.sleep).toHaveBeenCalledWith(25);
  });

  it('exhausts retries and marks the circuit degraded', async () => {
    fetchMock.mockRejectedValue(new Error('persistent'));
    const client = new ArbeitnowClient('p', 'https://example', 5000, 1);
    await expect(client.fetchFeedJobs()).rejects.toMatchObject({
      message: expect.stringContaining('Failed to fetch after 3 attempts'),
    });
    const health = await client.healthCheck();
    expect(health.consecutiveFailures).toBe(1);
    expect(health.status).toBe(ProviderHealthStatus.DEGRADED);
  });

  it('opens the circuit after five consecutive failures and throws immediately', async () => {
    fetchMock.mockRejectedValue(new Error('persistent'));
    const client = new ArbeitnowClient('p', 'https://example', 5000, 1);
    (client as any).consecutiveFailures = 4;
    await expect(client.fetchFeedJobs()).rejects.toBeInstanceOf(ProviderFetchError);
    const health = await client.healthCheck();
    expect(health.consecutiveFailures).toBe(5);
    expect(health.status).toBe(ProviderHealthStatus.CIRCUIT_OPEN);

    // Circuit now open -> immediate throw without a fetch.
    await expect(client.fetchFeedJobs()).rejects.toThrow(/Circuit breaker is OPEN/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('exposes rate limit status', () => {
    const client = new ArbeitnowClient('p');
    const status = client.getRateLimitStatus();
    expect(status.remaining).toBe(1000);
    expect(status.limit).toBe(1000);
    expect(status.resetAt).toBeUndefined();
  });
});
