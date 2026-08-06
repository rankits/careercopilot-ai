import { describe, it, expect, beforeEach } from 'vitest';
import {
  JobProviderRegistry,
  IJobProvider,
  ProviderTier,
  ProviderHealthStatus,
} from '@/modules/jobs/index.js';

const createMockProvider = (name: string, tier: ProviderTier, isEnabled = true): IJobProvider => ({
  name,
  tier,
  isEnabled,
  manifest: {
    name,
    priority: 0,
    tier,
    supportsPagination: true,
    supportsIncrementalSync: false,
    rateLimitPerMinute: 60,
    batchSize: 50,
    concurrency: 2,
    retryPolicy: 'exponential',
    enabled: isEnabled,
  },
  async fetchJobs() {
    return [];
  },
  async healthCheck() {
    return {
      status: ProviderHealthStatus.HEALTHY,
      lastCheckedAt: new Date().toISOString(),
      consecutiveFailures: 0,
    };
  },
  getRateLimitStatus() {
    return { limit: 60, remaining: 60, resetAt: new Date().toISOString() };
  },
});

describe('JobProviderRegistry - branch coverage', () => {
  let registry: JobProviderRegistry;

  beforeEach(() => {
    registry = new JobProviderRegistry();
  });

  it('getByName returns the provider case/whitespace-insensitively or undefined', () => {
    registry.register(createMockProvider('Lever', ProviderTier.PUBLIC));

    expect(registry.getByName('  lever ')).toBeDefined();
    expect(registry.getByName('LEVER')).toBeDefined();
    expect(registry.getByName('missing')).toBeUndefined();
  });

  it('getAll returns all registered providers', () => {
    registry.register(createMockProvider('A', ProviderTier.PUBLIC));
    registry.register(createMockProvider('B', ProviderTier.FREE_AUTH));

    const all = registry.getAll();
    expect(all).toHaveLength(2);
  });

  it('getByTier filters by tier', () => {
    const pubA = createMockProvider('A', ProviderTier.PUBLIC);
    const pubB = createMockProvider('B', ProviderTier.PUBLIC);
    const paid = createMockProvider('C', ProviderTier.PAID_AUTH);
    registry.register(pubA);
    registry.register(pubB);
    registry.register(paid);

    const pubs = registry.getByTier(ProviderTier.PUBLIC);
    expect(pubs.map((p) => p.name)).toEqual(['A', 'B']);
    expect(registry.getByTier(ProviderTier.PAID_AUTH).map((p) => p.name)).toEqual(['C']);
  });

  it('getEnabledProviders filters by disabled, tiers, and names', () => {
    const a = createMockProvider('Alpha', ProviderTier.PUBLIC, true);
    const b = createMockProvider('Beta', ProviderTier.PUBLIC, false);
    const c = createMockProvider('Gamma', ProviderTier.FREE_AUTH, true);
    const d = createMockProvider('Delta', ProviderTier.PAID_AUTH, true);
    registry.register(a);
    registry.register(b);
    registry.register(c);
    registry.register(d);

    // Disabled providers are excluded.
    expect(registry.getEnabledProviders().map((p) => p.name)).toEqual(['Alpha', 'Gamma', 'Delta']);

    // Only matching tiers.
    expect(
      registry.getEnabledProviders({ tiers: [ProviderTier.PUBLIC] }).map((p) => p.name),
    ).toEqual(['Alpha']);
    expect(
      registry
        .getEnabledProviders({ tiers: [ProviderTier.PUBLIC, ProviderTier.FREE_AUTH] })
        .map((p) => p.name),
    ).toEqual(['Alpha', 'Gamma']);

    // Names filter with case/whitespace normalization.
    expect(registry.getEnabledProviders({ names: ['  delta '] }).map((p) => p.name)).toEqual([
      'Delta',
    ]);
    expect(registry.getEnabledProviders({ names: ['gamma', 'ALPHA'] }).map((p) => p.name)).toEqual([
      'Alpha',
      'Gamma',
    ]);

    // Both tiers and names combined.
    expect(
      registry
        .getEnabledProviders({
          tiers: [ProviderTier.PUBLIC],
          names: ['Alpha'],
        })
        .map((p) => p.name),
    ).toEqual(['Alpha']);

    // Empty matches when a name filter excludes everything.
    expect(registry.getEnabledProviders({ names: ['nope'] })).toEqual([]);
  });

  it('sorts by priority descending then name, logging the sorted list', () => {
    const low = createMockProvider('Low', ProviderTier.PUBLIC);
    low.manifest!.priority = 10;
    const high = createMockProvider('High', ProviderTier.PUBLIC);
    high.manifest!.priority = 100;
    const tie = createMockProvider('TieA', ProviderTier.PUBLIC);
    tie.manifest!.priority = 10;
    registry.register(low);
    registry.register(high);
    registry.register(tie);

    const sorted = registry.getEnabledProvidersSortedByPriority();
    expect(sorted.map((p) => p.name)).toEqual(['High', 'Low', 'TieA']);
  });
});
