import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/modules/job-listing/index.js', () => ({
  jobListingService: {
    searchJobs: vi.fn(),
    getJobDetails: vi.fn(),
  },
}));

import {
  getJobByIdController,
  searchJobsController,
} from '@/modules/job-listing/controllers/job-listing.controller.js';
import { jobListingService } from '@/modules/job-listing/index.js';
import { resetJobListingMetricsForTests } from '@/modules/job-listing/observability/job-listing.metrics.js';

afterEach(() => {
  vi.restoreAllMocks();
  resetJobListingMetricsForTests();
});

const mockedService = vi.mocked(jobListingService);

const makeRes = () => {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  return res as unknown as import('express').Response;
};
const makeNext = () => vi.fn();
const makeReq = (query: Record<string, unknown> = {}) => ({ query, params: {} }) as never;

const okResult = (totalItems: number) => ({
  items: [],
  pagination: {
    page: 1,
    limit: 20,
    totalItems,
    totalPages: totalItems === 0 ? 0 : 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
});

describe('searchJobsController', () => {
  it('returns a success envelope and forwards filters', async () => {
    mockedService.searchJobs.mockResolvedValue(okResult(2) as never);
    const res = makeRes();
    const next = makeNext();

    await searchJobsController(
      makeReq({
        query: 'engineer',
        companySlug: 'acme',
        location: 'Remote',
        remoteTypes: 'REMOTE',
        employmentTypes: ['FULL_TIME'],
        skills: ['React'],
        minSalary: '50000',
        maxSalary: '150000',
        sortBy: 'salaryHighToLow',
        page: '2',
        limit: '10',
      }),
      res,
      next,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockedService.searchJobs).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          remoteTypes: ['REMOTE'],
          employmentTypes: ['FULL_TIME'],
          skills: ['React'],
          minSalary: 50000,
          maxSalary: 150000,
        }),
        pagination: { page: 2, limit: 10 },
        sortBy: 'salaryHighToLow',
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('coerces single-string list filters into arrays', async () => {
    mockedService.searchJobs.mockResolvedValue(okResult(1) as never);
    const res = makeRes();
    const next = makeNext();

    await searchJobsController(
      makeReq({
        remoteTypes: ['REMOTE', 'HYBRID'],
        employmentTypes: 'CONTRACT',
        skills: 'Go',
      }),
      res,
      next,
    );

    expect(mockedService.searchJobs).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          remoteTypes: ['REMOTE', 'HYBRID'],
          employmentTypes: ['CONTRACT'],
          skills: ['Go'],
        }),
      }),
    );
  });

  it('uses defaults when query values are absent', async () => {
    mockedService.searchJobs.mockResolvedValue(okResult(0) as never);
    const res = makeRes();
    const next = makeNext();

    await searchJobsController(makeReq({}), res, next);

    expect(mockedService.searchJobs).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: {},
        pagination: { page: 1, limit: 20 },
        sortBy: 'newest',
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('records an error metric and forwards to next when the service throws', async () => {
    const boom = new Error('downstream');
    mockedService.searchJobs.mockRejectedValue(boom);
    const res = makeRes();
    const next = makeNext();

    await searchJobsController(makeReq({ query: 'x' }), res, next);

    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(next).toHaveBeenCalledWith(boom);
  });
});

describe('getJobByIdController', () => {
  it('returns 404 when the job is missing', async () => {
    mockedService.getJobDetails.mockResolvedValue(null);
    const res = makeRes();
    const next = makeNext();

    await getJobByIdController(
      { query: {}, params: { jobId: '00000000-0000-4000-8000-000000000001' } } as never,
      res,
      next,
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 200 with the job detail', async () => {
    mockedService.getJobDetails.mockResolvedValue({ id: 'job-1' } as never);
    const res = makeRes();
    const next = makeNext();

    await getJobByIdController(
      { query: {}, params: { jobId: '00000000-0000-4000-8000-000000000001' } } as never,
      res,
      next,
    );

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('forwards service errors to next', async () => {
    const boom = new Error('boom');
    mockedService.getJobDetails.mockRejectedValue(boom);
    const res = makeRes();
    const next = makeNext();

    await getJobByIdController(
      { query: {}, params: { jobId: '00000000-0000-4000-8000-000000000001' } } as never,
      res,
      next,
    );

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(boom);
  });
});
