import { describe, expect, it } from 'vitest';
import { DeduplicationEngine } from '@/modules/jobs/services/aggregation/deduplication.engine.js';
import { NormalizedJob } from '@/modules/jobs/models/NormalizedJob.js';
import { ProviderTier } from '@/modules/jobs/types/job.types.js';

const job = (
  hash: string,
  tier: ProviderTier,
  postedAt: string,
  tags: string[] = [],
): NormalizedJob =>
  ({
    providerTier: tier,
    canonicalHash: hash,
    postedAt,
    tags,
  }) as unknown as NormalizedJob;

describe('DeduplicationEngine', () => {
  it('keeps unique jobs unchanged and removes no duplicates', () => {
    const engine = new DeduplicationEngine();
    const a = job('h1', ProviderTier.PUBLIC, '2026-01-01');
    const b = job('h2', ProviderTier.PUBLIC, '2026-01-02');
    const result = engine.deduplicate([a, b]);
    expect(result.uniqueJobs).toHaveLength(2);
    expect(result.duplicatesRemoved).toBe(0);
    expect(result.uniqueJobs[0]).toBe(a);
  });

  it('picks the highest-tier winner and merges tags across duplicates', () => {
    const engine = new DeduplicationEngine();
    const low = job('hash', ProviderTier.PUBLIC, '2026-01-03', ['a']);
    const high = job('hash', ProviderTier.PAID_AUTH, '2026-01-01', ['b', 'c']);
    const mid = job('hash', ProviderTier.FREE_AUTH, '2026-01-02', ['d']);

    const result = engine.deduplicate([low, high, mid]);

    expect(result.duplicatesRemoved).toBe(2);
    expect(result.uniqueJobs).toHaveLength(1);
    expect(result.uniqueJobs[0]).toMatchObject({ providerTier: ProviderTier.PAID_AUTH });
    // tag order follows the tier-sorted group (PAID_AUTH, FREE_AUTH, PUBLIC)
    expect(result.uniqueJobs[0].tags).toEqual(['b', 'c', 'd', 'a']);
  });

  it('picks the newest posting when tiers are equal', () => {
    const engine = new DeduplicationEngine();
    const older = job('h', ProviderTier.FREE_AUTH, '2026-01-01');
    const newer = job('h', ProviderTier.FREE_AUTH, '2026-02-01');

    const result = engine.deduplicate([older, newer]);

    expect(result.uniqueJobs[0]).toMatchObject({ postedAt: '2026-02-01' });
    expect(result.duplicatesRemoved).toBe(1);
  });

  it('handles empty input', () => {
    const result = new DeduplicationEngine().deduplicate([]);
    expect(result.uniqueJobs).toEqual([]);
    expect(result.duplicatesRemoved).toBe(0);
  });
});
