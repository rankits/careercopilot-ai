import { describe, expect, it } from 'vitest';
import type { NormalizedJob } from '@/modules/jobs/models/NormalizedJob.js';
import { resolveJobEffectiveDate } from '@/modules/jobs/utils/job-effective-date-resolver.js';
import { ProviderTier } from '@/modules/jobs/types/job.types.js';

const job = (overrides: Partial<NormalizedJob> = {}): NormalizedJob => ({
  id: 'id',
  providerJobId: 'p1',
  providerName: 'arbeitnow',
  providerTier: ProviderTier.PUBLIC,
  title: 'Engineer',
  normalizedTitle: 'engineer',
  companyName: 'Acme',
  normalizedCompany: 'acme',
  location: { raw: 'Remote', isRemote: true },
  description: 'desc',
  applyUrl: 'https://example.test',
  tags: [],
  postedAt: '2026-06-01T00:00:00.000Z',
  canonicalHash: 'hash',
  ...overrides,
});

describe('resolveJobEffectiveDate', () => {
  it('prefers provider openingDate over postedAt', () => {
    const resolved = resolveJobEffectiveDate({
      normalizedJob: job(),
      providerMetadata: { openingDate: '2026-07-01T00:00:00.000Z' },
      firstSeen: new Date('2026-01-01T00:00:00.000Z'),
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
    });
    expect(resolved).toEqual(new Date('2026-07-01T00:00:00.000Z'));
  });

  it('falls back to publicationDate then postedAt then firstSeen then createdAt', () => {
    expect(
      resolveJobEffectiveDate({
        providerMetadata: { publicationDate: '2026-05-01T00:00:00.000Z' },
      }),
    ).toEqual(new Date('2026-05-01T00:00:00.000Z'));

    expect(resolveJobEffectiveDate({ normalizedJob: job() })).toEqual(
      new Date('2026-06-01T00:00:00.000Z'),
    );

    expect(
      resolveJobEffectiveDate({
        firstSeen: new Date('2026-04-01T00:00:00.000Z'),
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
      }),
    ).toEqual(new Date('2026-04-01T00:00:00.000Z'));

    expect(
      resolveJobEffectiveDate({
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
      }),
    ).toEqual(new Date('2026-03-01T00:00:00.000Z'));
  });

  it('returns null when no reliable date exists', () => {
    expect(resolveJobEffectiveDate({})).toBeNull();
    expect(
      resolveJobEffectiveDate({
        providerMetadata: { openingDate: 'not-a-date' },
        normalizedJob: job({ postedAt: 'also-bad' }),
      }),
    ).toBeNull();
  });

  it('never treats lastSeen/updatedAt-style fields as publication dates', () => {
    expect(
      resolveJobEffectiveDate({
        providerMetadata: {
          lastSeen: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
        },
      }),
    ).toBeNull();
  });
});
