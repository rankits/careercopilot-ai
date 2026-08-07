import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { BaseProviderClient } from '@/modules/jobs/providers/base/base.client.js';
import {
  ProviderHealthStatus,
  ProviderRateLimitStatus,
} from '@/modules/jobs/types/provider.types.js';
import { ProviderFetchError } from '@/modules/jobs/errors/ProviderFetchError.js';
import { RateLimitError } from '@/modules/jobs/errors/RateLimitError.js';

// Stub out real sleeps/backoff so tests run immediately and deterministically.
vi.mock('@/modules/jobs/utils/backoff.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/modules/jobs/utils/backoff.js')>();
  return {
    ...actual,
    sleep: vi.fn(async () => {}),
    calculateJitteredBackoff: vi.fn(() => 1),
  };
});

import { sleep, calculateJitteredBackoff } from '@/modules/jobs/utils/backoff.js';

const sleepMock = vi.mocked(sleep);
const jitterMock = vi.mocked(calculateJitteredBackoff);

class ConcreteClient extends BaseProviderClient {
  operation = vi.fn<() => Promise<number>>();

  get failures(): number {
    return this.consecutiveFailures;
  }

  get circuitStatusValue(): string {
    return this.circuitStatus;
  }

  setFailures(n: number): void {
    this.consecutiveFailures = n;
  }

  setResetAt(value: string | undefined): void {
    this.rateLimitResetAt = value;
  }

  async run(op?: () => Promise<number>): Promise<number> {
    return this.executeWithRetry(op ?? this.operation);
  }
}

describe('BaseProviderClient', () => {
  beforeEach(() => {
    sleepMock.mockClear();
    jitterMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports rate limit status and health', async () => {
    const client = new ConcreteClient({
      providerName: 'test',
      baseUrl: 'https://example.test',
    });
    client.setResetAt('2026-08-06T00:00:00.000Z');

    const status = client.getRateLimitStatus();
    expect(status.remaining).toBe(1000);
    expect(status.limit).toBe(1000);
    expect(status.resetAt).toBe('2026-08-06T00:00:00.000Z');

    const health = await client.healthCheck();
    expect(health.status).toBe(ProviderHealthStatus.HEALTHY);
    expect(health.consecutiveFailures).toBe(0);
    expect(health.lastCheckedAt).toEqual(expect.any(String));
  });

  it('throws immediately when the circuit breaker is OPEN', async () => {
    const client = new ConcreteClient({
      providerName: 'test',
      baseUrl: 'https://test.test',
      maxRetries: 3,
    });
    (client as unknown as { circuitStatus: string }).circuitStatus =
      ProviderHealthStatus.CIRCUIT_OPEN;

    await expect(client.run()).rejects.toThrow(/Circuit breaker is OPEN/);
    expect(client.operation).not.toHaveBeenCalled();
  });

  it('returns the operation result and resets health on success', async () => {
    const client = new ConcreteClient({ providerName: 'test', baseUrl: 'https://test.test' });
    client.operation.mockResolvedValue(42);

    await expect(client.run()).resolves.toBe(42);
    expect(client.failures).toBe(0);
    expect(client.circuitStatusValue).toBe(ProviderHealthStatus.HEALTHY);
  });

  it('retries on RateLimitError, sleeping for retryAfterMs, before succeeding', async () => {
    const client = new ConcreteClient({
      providerName: 'test',
      baseUrl: 'https://test.test',
      maxRetries: 3,
    });
    client.operation.mockRejectedValueOnce(new RateLimitError('test', 10)).mockResolvedValueOnce(7);

    await expect(client.run()).resolves.toBe(7);
    expect(sleepMock).toHaveBeenCalledWith(10);
  });

  it('retries on generic errors with jittered backoff before succeeding', async () => {
    const client = new ConcreteClient({
      providerName: 'test',
      baseUrl: 'https://test.test',
      maxRetries: 3,
    });
    client.operation.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(5);

    await expect(client.run()).resolves.toBe(5);
    expect(jitterMock).toHaveBeenCalled();
    expect(sleepMock).toHaveBeenCalledWith(1);
  });

  it('exhausts retries, increments consecutive failures, and opens the circuit after 5 failures', async () => {
    const client = new ConcreteClient({
      providerName: 'test',
      baseUrl: 'https://test.test',
      maxRetries: 1,
    });
    client.operation.mockRejectedValue(new Error('persistent'));

    await expect(client.run()).rejects.toBeInstanceOf(ProviderFetchError);
    expect(client.failures).toBe(1);
    expect(client.circuitStatusValue).toBe(ProviderHealthStatus.DEGRADED);

    // Push over the threshold so the circuit opens.
    client.setFailures(4);
    client.operation.mockRejectedValue(new Error('persistent'));
    await expect(client.run()).rejects.toBeInstanceOf(ProviderFetchError);
    expect(client.failures).toBe(5);
    expect(client.circuitStatusValue).toBe(ProviderHealthStatus.CIRCUIT_OPEN);
  });

  it('rethrows the original provider error message after retry exhaustion', async () => {
    const client = new ConcreteClient({
      providerName: 'test',
      baseUrl: 'https://test.test',
      maxRetries: 1,
    });
    client.operation.mockRejectedValue(new Error('the-root-cause'));

    await expect(client.run()).rejects.toMatchObject({
      message: expect.stringContaining('Failed to fetch after 1 attempts'),
    });
  });

  it('defaults RateLimitError retryAfterMs to 2000 when absent', async () => {
    const client = new ConcreteClient({
      providerName: 'test',
      baseUrl: 'https://test.test',
      maxRetries: 3,
    });
    client.operation.mockRejectedValueOnce(new RateLimitError('test')).mockResolvedValueOnce(1);

    await expect(client.run()).resolves.toBe(1);
    expect(sleepMock).toHaveBeenCalledWith(2000);
  });

  it('handles non-Error rejection values across all attempts', async () => {
    const client = new ConcreteClient({
      providerName: 'test',
      baseUrl: 'https://test.test',
      maxRetries: 1,
    });
    client.operation.mockRejectedValue('plain-string-failure');

    await expect(client.run()).rejects.toBeInstanceOf(ProviderFetchError);
    expect(client.failures).toBe(1);
    expect(client.circuitStatusValue).toBe(ProviderHealthStatus.DEGRADED);
  });
});
