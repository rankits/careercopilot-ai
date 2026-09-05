import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '@/test-utils/app.js';
import { resetTestState } from '@/test-utils/reset.js';
import { jobListingService } from '@/modules/job-listing/index.js';

const API = '/api/v1/jobs';

beforeEach(async () => {
  await resetTestState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('JOB-QA-001 GET /jobs filters and pagination', () => {
  it('rejects sortBy=relevance with 400', async () => {
    const spy = vi.spyOn(jobListingService, 'searchJobs');
    const res = await request(app).get(`${API}?sortBy=relevance`);
    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it('forwards page/limit/sort and location/skills to the service', async () => {
    const spy = vi.spyOn(jobListingService, 'searchJobs').mockResolvedValue({
      items: [],
      pagination: {
        page: 2,
        limit: 10,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    const res = await request(app).get(
      `${API}?page=2&limit=10&sortBy=salaryHighToLow&location=Remote&skills=React`,
    );

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        pagination: { page: 2, limit: 10 },
        sortBy: 'salaryHighToLow',
        filters: expect.objectContaining({
          location: 'Remote',
          skills: expect.anything(),
        }),
      }),
      undefined,
    );
  });

  it('returns pagination metadata in the success envelope', async () => {
    vi.spyOn(jobListingService, 'searchJobs').mockResolvedValue({
      items: [
        {
          id: 'job-1',
          title: 'Engineer',
          company: { slug: 'acme', name: 'Acme', logoUrl: null, verified: false },
          location: { formatted: 'Remote', remoteType: 'REMOTE' },
          employmentType: null,
          salary: { minimum: null, maximum: null, currency: null },
          skills: [],
          publishedAt: null,
          applyUrl: 'https://example.com/apply',
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    const res = await request(app).get(API);
    expect(res.status).toBe(200);
    expect(res.body.data.pagination.totalItems).toBe(1);
    expect(res.body.data.items[0].applyUrl).toBe('https://example.com/apply');
  });
});
