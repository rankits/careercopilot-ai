import { describe, expect, it } from 'vitest';
import { toJobListDto } from '@/modules/job-listing/repositories/prisma-job-search.repository.js';

describe('toJobListDto applyUrl', () => {
  const baseJob = {
    id: 'job-1',
    title: 'Engineer',
    companySlug: 'acme',
    employmentType: 'FULL_TIME',
    remoteType: 'REMOTE',
    descriptionHtml: '<p>Hi</p>',
    descriptionText: 'Hi',
    salaryMin: 100000,
    salaryMax: 150000,
    currency: 'USD',
    skills: ['TypeScript'],
    benefits: [],
    tags: [],
    providerMetadata: {},
    status: 'ACTIVE' as const,
    version: 1,
    firstSeen: new Date('2026-01-01T00:00:00.000Z'),
    lastSeen: new Date('2026-01-01T00:00:00.000Z'),
    lastChecked: new Date('2026-01-01T00:00:00.000Z'),
    postedAt: new Date('2026-01-02T00:00:00.000Z'),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    canonicalHash: 'hash',
    company: {
      id: 'co-1',
      slug: 'acme',
      name: 'Acme',
      logoUrl: null,
      industry: null,
      size: null,
      verified: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  };

  it('maps highest-priority safe applyUrl onto the listing DTO', () => {
    const dto = toJobListDto({
      ...baseJob,
      sources: [
        { applyUrl: 'javascript:alert(1)' },
        { applyUrl: 'https://boards.example.com/jobs/1' },
      ],
    });

    expect(dto.applyUrl).toBe('https://boards.example.com/jobs/1');
    expect(dto).toMatchObject({
      id: 'job-1',
      title: 'Engineer',
      company: { slug: 'acme', name: 'Acme', verified: true },
    });
  });

  it('sets applyUrl null when sources are missing or unsafe', () => {
    expect(toJobListDto({ ...baseJob, sources: [] }).applyUrl).toBeNull();
    expect(
      toJobListDto({ ...baseJob, sources: [{ applyUrl: 'javascript:x' }] }).applyUrl,
    ).toBeNull();
  });
});
