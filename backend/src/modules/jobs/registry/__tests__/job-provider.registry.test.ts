import { describe, it, expect, beforeEach } from 'vitest';
import {
  JobProviderRegistry,
  IJobProvider,
  ProviderTier,
  ProviderHealthStatus,
  DuplicateProviderRegistrationError,
} from '@/modules/jobs/index.js';

const createMockProvider = (name: string, priority: number, isEnabled = true): IJobProvider => ({
  name,
  tier: ProviderTier.PUBLIC,
  isEnabled,
  manifest: {
    name,
    priority,
    tier: ProviderTier.PUBLIC,
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
    return {
      limit: 60,
      remaining: 60,
      resetAt: new Date().toISOString(),
    };
  },
});

describe('JobProviderRegistry - JAP-401 Specification', () => {
  let registry: JobProviderRegistry;

  beforeEach(() => {
    registry = new JobProviderRegistry();
  });

  it('should sort enabled providers by priority descending', () => {
    const greenhouse = createMockProvider('Greenhouse', 90);
    const lever = createMockProvider('Lever', 100);
    const arbeitnow = createMockProvider('Arbeitnow', 50);

    registry.register(greenhouse);
    registry.register(lever);
    registry.register(arbeitnow);

    const sorted = registry.getEnabledProvidersSortedByPriority();
    expect(sorted.map((p) => p.name)).toEqual(['Lever', 'Greenhouse', 'Arbeitnow']);
  });

  it('should break priority ties alphabetically by provider name', () => {
    const zebra = createMockProvider('Zebra', 80);
    const alpha = createMockProvider('Alpha', 80);

    registry.register(zebra);
    registry.register(alpha);

    const sorted = registry.getEnabledProvidersSortedByPriority();
    expect(sorted.map((p) => p.name)).toEqual(['Alpha', 'Zebra']);
  });

  it('should throw DuplicateProviderRegistrationError when registering duplicate provider name', () => {
    const greenhouse1 = createMockProvider('Greenhouse', 90);
    const greenhouse2 = createMockProvider('greenhouse', 100);

    registry.register(greenhouse1);
    expect(() => registry.register(greenhouse2)).toThrow(DuplicateProviderRegistrationError);
  });

  it('should filter out disabled providers from getEnabledProvidersSortedByPriority', () => {
    const lever = createMockProvider('Lever', 100, true);
    const greenhouse = createMockProvider('Greenhouse', 90, false);

    registry.register(lever);
    registry.register(greenhouse);

    const sorted = registry.getEnabledProvidersSortedByPriority();
    expect(sorted.map((p) => p.name)).toEqual(['Lever']);
  });
});
