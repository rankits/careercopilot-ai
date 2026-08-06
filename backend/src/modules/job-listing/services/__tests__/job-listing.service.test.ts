import { afterEach, describe, expect, it, vi } from 'vitest';
import { jobAgePolicy } from '@/modules/jobs/policies/job-age-policy.js';
import { JobListingService } from '@/modules/job-listing/services/job-listing.service.js';

afterEach(() => {
  vi.restoreAllMocks();
});

const makeRepo = () => ({
  search: vi.fn(),
  findById: vi.fn(),
});

describe('JobListingService.searchJobs', () => {
  it('delegates directly when the storage age filter is disabled', async () => {
    vi.spyOn(jobAgePolicy, 'getStorageCutoffDate').mockReturnValue(null);
    const repo = makeRepo();
    repo.search.mockResolvedValue({ items: [], pagination: { page: 1, totalItems: 0 } });

    const service = new JobListingService(repo as never);
    const options = {
      filters: {},
      pagination: { page: 1, limit: 20 },
      sortBy: 'newest' as const,
    };
    const result = await service.searchJobs(options);

    expect(repo.search).toHaveBeenCalledWith(options);
    expect(result).toEqual({ items: [], pagination: { page: 1, totalItems: 0 } });
  });

  it('clamps an older postedSince to the storage cutoff', async () => {
    const cutoff = new Date('2026-06-01T00:00:00.000Z');
    vi.spyOn(jobAgePolicy, 'getStorageCutoffDate').mockReturnValue(cutoff);
    const repo = makeRepo();
    const service = new JobListingService(repo as never);

    await service.searchJobs({
      filters: { postedSince: new Date('2020-01-01T00:00:00.000Z') },
      pagination: { page: 1, limit: 20 },
      sortBy: 'newest',
    });

    expect(repo.search).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({ postedSince: cutoff }),
      }),
    );
  });

  it('fills a missing postedSince with the storage cutoff', async () => {
    const cutoff = new Date('2026-06-01T00:00:00.000Z');
    vi.spyOn(jobAgePolicy, 'getStorageCutoffDate').mockReturnValue(cutoff);
    const repo = makeRepo();
    const service = new JobListingService(repo as never);

    await service.searchJobs({
      filters: {},
      pagination: { page: 1, limit: 20 },
      sortBy: 'newest',
    });

    expect(repo.search).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({ postedSince: cutoff }),
      }),
    );
  });

  it('keeps a postedSince newer than the cutoff', async () => {
    const cutoff = new Date('2026-06-01T00:00:00.000Z');
    const requested = new Date('2026-07-01T00:00:00.000Z');
    vi.spyOn(jobAgePolicy, 'getStorageCutoffDate').mockReturnValue(cutoff);
    const repo = makeRepo();
    const service = new JobListingService(repo as never);

    await service.searchJobs({
      filters: { postedSince: requested },
      pagination: { page: 1, limit: 20 },
      sortBy: 'newest',
    });

    expect(repo.search).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({ postedSince: requested }),
      }),
    );
  });
});

describe('JobListingService.getJobDetails', () => {
  it('delegates to the repository findById', async () => {
    const repo = makeRepo();
    repo.findById.mockResolvedValue({ id: 'job-1' });
    const service = new JobListingService(repo as never);

    await expect(service.getJobDetails('job-1')).resolves.toEqual({ id: 'job-1' });
    expect(repo.findById).toHaveBeenCalledWith('job-1');
  });
});
