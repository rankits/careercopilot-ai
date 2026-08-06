import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AggregationService } from '@/modules/jobs/services/aggregation/aggregation.service.js';
import { NormalizedJob } from '@/modules/jobs/models/NormalizedJob.js';
import { ProviderTier } from '@/modules/jobs/types/job.types.js';

const h = vi.hoisted(() => ({
  dedup: { deduplicate: vi.fn() },
  logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

vi.mock('@/modules/jobs/services/aggregation/deduplication.engine.js', () => ({
  DeduplicationEngine: class {
    deduplicate = h.dedup.deduplicate;
  },
}));

vi.mock('@/shared/utils/logger.js', () => ({ jobsLogger: h.logger }));

import { DeduplicationEngine } from '@/modules/jobs/services/aggregation/deduplication.engine.js';

const j1 = { id: '1', providerName: 'p1' } as unknown as NormalizedJob;
const j2 = { id: '2', providerName: 'p2' } as unknown as NormalizedJob;

const makeProvider = (name: string, jobs?: NormalizedJob[]) => {
  const fetchJobs = vi.fn();
  if (jobs) fetchJobs.mockResolvedValue(jobs);
  return { name, tier: ProviderTier.PUBLIC, fetchJobs };
};

beforeEach(() => {
  h.dedup.deduplicate.mockReset();
  h.logger.info.mockClear();
  h.logger.debug.mockClear();
  h.logger.error.mockClear();
  h.dedup.deduplicate.mockImplementation((raw: NormalizedJob[]) => ({
    uniqueJobs: [...raw],
    duplicatesRemoved: 0,
  }));
});

describe('AggregationService', () => {
  it('aggregates jobs from successful providers and deduplicates', async () => {
    const pA = makeProvider('A', [j1]);
    const pB = makeProvider('B', [j2]);
    const registry = { getEnabledProviders: vi.fn(() => [pA, pB]) };
    const service = new AggregationService(registry as never, new DeduplicationEngine());

    const result = await service.aggregateJobs({});

    expect(result.jobs).toHaveLength(2);
    expect(result.totalFetched).toBe(2);
    expect(result.duplicatesRemoved).toBe(0);
    expect(result.providerStats.A?.fetched).toBe(1);
    expect(result.providerStats.B?.fetched).toBe(1);
    expect(h.dedup.deduplicate).toHaveBeenCalledTimes(1);
  });

  it('records an error for a failing provider and excludes its jobs', async () => {
    const pGood = makeProvider('Good', [j1]);
    const pBad = makeProvider('Bad', undefined);
    pBad.fetchJobs.mockRejectedValue(new Error('boom'));
    const registry = { getEnabledProviders: vi.fn(() => [pGood, pBad]) };
    const service = new AggregationService(registry as never, new DeduplicationEngine());

    const result = await service.aggregateJobs({});

    expect(result.totalFetched).toBe(1);
    expect(result.providerStats.Bad?.fetched).toBe(0);
    expect(result.providerStats.Bad?.error).toBe('boom');
    expect(h.logger.error).toHaveBeenCalled();
  });

  it('captures an originalError cause on provider failure', async () => {
    const pBad = makeProvider('Bad');
    const originalError = new Error('origin');
    const wrapped = new Error('wrapped');
    (wrapped as { originalError?: unknown }).originalError = originalError;
    pBad.fetchJobs.mockRejectedValue(wrapped);
    const registry = { getEnabledProviders: vi.fn(() => [pBad]) };
    const service = new AggregationService(registry as never, new DeduplicationEngine());

    const result = await service.aggregateJobs({});

    // error opts for the cause when one is present
    expect(result.providerStats.Bad?.error).toBe('origin');
    expect(h.logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        cause: expect.objectContaining({ name: 'Error', message: 'origin' }),
      }),
      'Provider fetch failed',
    );
  });

  it('strings non-Error rejections', async () => {
    const pBad = makeProvider('Bad');
    pBad.fetchJobs.mockRejectedValue('plain string');
    const registry = { getEnabledProviders: vi.fn(() => [pBad]) };
    const service = new AggregationService(registry as never, new DeduplicationEngine());

    const result = await service.aggregateJobs({});

    expect(result.providerStats.Bad?.error).toBe('plain string');
  });
});
