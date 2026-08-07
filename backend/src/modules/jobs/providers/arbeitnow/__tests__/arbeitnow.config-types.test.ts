import { describe, expect, it } from 'vitest';
import * as configModule from '@/modules/jobs/providers/arbeitnow/config.js';
import * as typesModule from '@/modules/jobs/providers/arbeitnow/types.js';
import type { ArbeitnowProviderConfig } from '@/modules/jobs/providers/arbeitnow/config.js';
import type {
  ArbeitnowJobPosting,
  ArbeitnowJobsResponse,
} from '@/modules/jobs/providers/arbeitnow/types.js';
import { ProviderTier } from '@/modules/jobs/types/job.types.js';

describe('Arbeitnow config module', () => {
  it('is a loadable module exposing the config interfaces (type-only)', () => {
    expect(typeof configModule).toBe('object');
  });

  it('supports the full ArbeitnowProviderConfig shape', () => {
    const config: ArbeitnowProviderConfig = {
      baseUrl: 'https://example.test/api',
      timeoutMs: 1234,
      maxPages: 5,
      tier: ProviderTier.FREE_AUTH,
    };
    expect(config.baseUrl).toBe('https://example.test/api');
    expect(config.timeoutMs).toBe(1234);
    expect(config.maxPages).toBe(5);
    expect(config.tier).toBe(ProviderTier.FREE_AUTH);
  });

  it('supports a minimal empty config', () => {
    const config: ArbeitnowProviderConfig = {};
    expect(config.baseUrl).toBeUndefined();
    expect(config.tier).toBeUndefined();
  });
});

describe('Arbeitnow types module', () => {
  it('is a loadable module exposing the posting interfaces (type-only)', () => {
    expect(typeof typesModule).toBe('object');
  });

  it('supports the ArbeitnowJobPosting shape', () => {
    const posting: ArbeitnowJobPosting = {
      slug: 'slug-1',
      company_name: 'Acme',
      title: 'Engineer',
      description: '<p>desc</p>',
      remote: true,
      url: 'https://apply.test/1',
      tags: ['a'],
      job_types: ['full-time'],
      location: 'Berlin',
      created_at: 1_785_321_027,
    };
    expect(posting.slug).toBe('slug-1');
    expect(posting.remote).toBe(true);
  });

  it('supports the ArbeitnowJobsResponse shape with optional links', () => {
    const response: ArbeitnowJobsResponse = {
      data: [],
      links: { next: null },
    };
    expect(response.data).toEqual([]);
    expect(response.links?.next).toBeNull();
  });
});
