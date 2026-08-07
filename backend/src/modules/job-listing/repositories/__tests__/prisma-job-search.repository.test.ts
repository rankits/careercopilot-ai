import { afterEach, describe, expect, it, vi } from 'vitest';
import '@/test-utils/prisma-mock.js';
import { prisma } from '@/shared/config/db.conf.js';
import { PrismaJobSearchRepository } from '@/modules/job-listing/repositories/prisma-job-search.repository.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PrismaJobSearchRepository.findById', () => {
  it('loads only ACTIVE jobs for public detail', async () => {
    const findFirst = vi.spyOn(prisma.job, 'findFirst').mockResolvedValue(null);

    const repo = new PrismaJobSearchRepository();
    const result = await repo.findById('job-1');

    expect(result).toBeNull();
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-1', status: 'ACTIVE' },
      }),
    );
  });

  it('returns null for inactive jobs (EXPIRED/REMOVED) without leaking fields', async () => {
    vi.spyOn(prisma.job, 'findFirst').mockResolvedValue(null);

    const repo = new PrismaJobSearchRepository();
    await expect(repo.findById('expired-job')).resolves.toBeNull();
  });
});

describe('PrismaJobSearchRepository.findByIds', () => {
  it('hydrates only ACTIVE jobs for recommendation retrieval', async () => {
    const findMany = vi.spyOn(prisma.job, 'findMany').mockResolvedValue([]);

    const repo = new PrismaJobSearchRepository();
    const result = await repo.findByIds(['active-job', 'expired-job']);

    expect(result).toEqual([]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: { in: ['active-job', 'expired-job'] },
          status: 'ACTIVE',
        },
      }),
    );
  });

  it('returns an empty array for an empty id list without querying', async () => {
    const findMany = vi.spyOn(prisma.job, 'findMany');
    const repo = new PrismaJobSearchRepository();

    expect(await repo.findByIds([])).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('returns an empty array when every id is blank after trimming', async () => {
    const findMany = vi.spyOn(prisma.job, 'findMany');
    const repo = new PrismaJobSearchRepository();

    expect(await repo.findByIds(['', '   '])).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('dedupes and preserves order, dropping unmatched inactive ids', async () => {
    const applyUrl = 'https://example.com/apply';
    const job = {
      id: 'job',
      title: 'Engineer',
      company: { slug: 'acme', name: 'Acme', logoUrl: null, verified: true },
      remoteType: 'REMOTE',
      providerMetadata: null,
      employmentType: null,
      salaryMin: null,
      salaryMax: null,
      currency: null,
      skills: [],
      postedAt: null,
      sources: [{ applyUrl }],
    };
    vi.spyOn(prisma.job, 'findMany').mockResolvedValue([job] as never);

    const repo = new PrismaJobSearchRepository();
    const result = await repo.findByIds([' job ', 'job', 'missing']);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('job');
    expect(result[0].applyUrl).toBe(applyUrl);
  });
});

const jobDetail = (overrides: Record<string, unknown> = {}) => ({
  id: 'job-1',
  title: 'Backend Engineer',
  company: {
    slug: 'acme',
    name: 'Acme',
    logoUrl: 'https://logo.example/a.png',
    verified: true,
    industry: 'Software',
    size: 'LARGE',
  },
  remoteType: 'REMOTE',
  providerMetadata: { locationRaw: 'Remote' },
  employmentType: 'FULL_TIME',
  salaryMin: 90000,
  salaryMax: 120000,
  currency: 'USD',
  skills: ['Node', 'Postgres'],
  postedAt: new Date('2026-01-01T00:00:00.000Z'),
  sources: [{ applyUrl: 'https://careers.example.com/a' }],
  descriptionHtml: '<p>hi</p>',
  descriptionText: 'hi',
  benefits: ['Health'],
  tags: ['Backend'],
  ...overrides,
});

describe('PrismaJobSearchRepository.findById (detail)', () => {
  it('returns the ACTIVE job detail including extras', async () => {
    vi.spyOn(prisma.job, 'findFirst').mockResolvedValue(jobDetail() as never);

    const repo = new PrismaJobSearchRepository();
    const result = await repo.findById('job-1');

    expect(result).toEqual(
      expect.objectContaining({
        id: 'job-1',
        descriptionHtml: '<p>hi</p>',
        benefits: ['Health'],
        tags: ['Backend'],
        companyIndustry: 'Software',
        companySize: 'LARGE',
      }),
    );
    expect(result?.applyUrl).toBe('https://careers.example.com/a');
  });

  it('coerces salary and derives formatted location/publishedAt', async () => {
    vi.spyOn(prisma.job, 'findFirst').mockResolvedValue(jobDetail() as never);
    const repo = new PrismaJobSearchRepository();
    const result = await repo.findById('job-1');
    expect(result?.salary.minimum).toBe(90000);
    expect(result?.salary.maximum).toBe(120000);
    expect(result?.publishedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('defaults null list columns to empty arrays', async () => {
    vi.spyOn(prisma.job, 'findFirst').mockResolvedValue(
      jobDetail({
        skills: null,
        benefits: null,
        tags: null,
        postedAt: null,
        salaryMin: null,
        salaryMax: null,
        sources: [],
      }) as never,
    );
    const repo = new PrismaJobSearchRepository();
    const result = await repo.findById('job-1');
    expect(result?.skills).toEqual([]);
    expect(result?.benefits).toEqual([]);
    expect(result?.tags).toEqual([]);
    expect(result?.publishedAt).toBeNull();
    expect(result?.applyUrl).toBeNull();
    expect(result?.salary).toEqual({ minimum: null, maximum: null, currency: 'USD' });
  });
});

describe('PrismaJobSearchRepository.search', () => {
  it('clamps pagination to page>=1 and limit to 1..100 and flattens results', async () => {
    prisma.job.count = vi.fn().mockResolvedValue(3) as never;
    vi.spyOn(prisma.job, 'findMany').mockResolvedValue([
      jobDetail(),
      jobDetail({ id: 'job-2' }),
    ] as never);

    const repo = new PrismaJobSearchRepository();
    const result = await repo.search({
      filters: {},
      pagination: { page: 0, limit: 999 },
      sortBy: 'newest',
    });

    expect(result.pagination).toEqual({
      page: 1,
      limit: 100,
      totalItems: 3,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
    expect(result.items).toHaveLength(2);
  });

  it('sorts salary high-to-low and reports hasNext/hasPrevious for a page in the middle', async () => {
    const findMany = vi.spyOn(prisma.job, 'findMany').mockResolvedValue([]);
    prisma.job.count = vi.fn().mockResolvedValue(150) as never;

    const repo = new PrismaJobSearchRepository();
    const result = await repo.search({
      filters: {},
      pagination: { page: 2, limit: 60 },
      sortBy: 'salaryHighToLow',
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { salaryMax: { sort: 'desc', nulls: 'last' } },
          { salaryMin: { sort: 'desc', nulls: 'last' } },
        ],
        skip: 60,
        take: 60,
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: [{ salaryMin: { not: null } }, { salaryMax: { not: null } }],
            }),
          ]),
        }),
      }),
    );
    expect(result.pagination).toEqual(
      expect.objectContaining({
        page: 2,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      }),
    );
  });

  it('sorts salary low-to-high and applies toolbar filters to the where clause', async () => {
    const findMany = vi.spyOn(prisma.job, 'findMany').mockResolvedValue([]);
    prisma.job.count = vi.fn().mockResolvedValue(0) as never;

    const repo = new PrismaJobSearchRepository();
    await repo.search({
      filters: { skills: ['Go'], remoteTypes: ['REMOTE'] },
      pagination: { page: 1, limit: 20 },
      sortBy: 'salaryLowToHigh',
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { salaryMin: { sort: 'asc', nulls: 'last' } },
          { salaryMax: { sort: 'asc', nulls: 'last' } },
        ],
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: [{ salaryMin: { not: null } }, { salaryMax: { not: null } }],
            }),
          ]),
        }),
      }),
    );
  });

  it('does not require disclosed salary when sorting by newest', async () => {
    const findMany = vi.spyOn(prisma.job, 'findMany').mockResolvedValue([]);
    prisma.job.count = vi.fn().mockResolvedValue(0) as never;

    const repo = new PrismaJobSearchRepository();
    await repo.search({
      filters: {},
      pagination: { page: 1, limit: 20 },
      sortBy: 'newest',
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ effectivePostedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
        where: expect.objectContaining({ status: 'ACTIVE' }),
      }),
    );
    const call = findMany.mock.calls[0]?.[0] as { where: Record<string, unknown> };
    expect(call.where).not.toHaveProperty('AND');
  });
});
