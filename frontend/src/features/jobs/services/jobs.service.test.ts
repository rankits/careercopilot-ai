import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JobNotFoundError, jobsService, normalizeJobsError } from './jobs.service';

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock('@/services/httpClient', () => ({
  httpClient: {
    get: getMock,
  },
}));

const listEnvelope = {
  data: {
    data: {
      items: [
        {
          id: 'job-1',
          title: 'Engineer',
          company: { slug: 'acme', name: 'Acme', logoUrl: null, verified: true },
          location: { formatted: 'Remote', remoteType: 'REMOTE' },
          employmentType: 'FULL_TIME',
          salary: { minimum: 10, maximum: 20, currency: 'USD' },
          skills: ['Go'],
          publishedAt: '2026-07-01T00:00:00.000Z',
          applyUrl: 'https://acme.test/jobs/1',
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
    },
  },
};

describe('jobsService.listJobs', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('parses the API envelope into typed jobs and forwards query params', async () => {
    getMock.mockResolvedValue(listEnvelope);

    await expect(
      jobsService.listJobs({
        page: 2,
        limit: 10,
        sortBy: 'salaryHighToLow',
        query: 'react',
        remoteTypes: 'REMOTE',
        minSalary: 50_000,
      }),
    ).resolves.toEqual(listEnvelope.data.data);

    expect(getMock).toHaveBeenCalledWith('/jobs', {
      signal: undefined,
      params: {
        page: 2,
        limit: 10,
        sortBy: 'salaryHighToLow',
        query: 'react',
        remoteTypes: 'REMOTE',
        minSalary: 50_000,
      },
    });
  });

  it('forwards AbortSignal so React Query can cancel superseded requests', async () => {
    getMock.mockResolvedValue(listEnvelope);
    const controller = new AbortController();

    await jobsService.listJobs({ page: 1 }, { signal: controller.signal });

    expect(getMock).toHaveBeenCalledWith(
      '/jobs',
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it('rejects unexpected response shapes', async () => {
    getMock.mockResolvedValue({ data: { ok: true } });
    await expect(jobsService.listJobs()).rejects.toThrow(/unexpected jobs response/i);
  });

  it('normalizes network failures into a user-facing message', async () => {
    getMock.mockRejectedValue(
      new axios.AxiosError('Network Error', 'ERR_NETWORK', undefined, undefined),
    );
    await expect(jobsService.listJobs()).rejects.toThrow(/unable to reach the jobs service/i);
  });

  it('normalizes 401 responses', async () => {
    getMock.mockRejectedValue(
      new axios.AxiosError('Unauthorized', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: {} as never,
        data: {},
      }),
    );
    await expect(jobsService.listJobs()).rejects.toThrow(/session has expired/i);
  });
});

describe('normalizeJobsError', () => {
  it('maps 5xx to a temporary unavailable message', () => {
    const error = new axios.AxiosError('Boom', 'ERR_BAD_RESPONSE', undefined, undefined, {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {},
      config: {} as never,
      data: {},
    });
    expect(normalizeJobsError(error).message).toMatch(/temporarily unavailable/i);
  });

  it('preserves canceled requests', () => {
    const canceled = new axios.AxiosError('canceled', 'ERR_CANCELED');
    canceled.name = 'CanceledError';
    expect(normalizeJobsError(canceled)).toBe(canceled);
  });
});

describe('jobsService.getJob', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('returns job detail from the API envelope', async () => {
    const detail = {
      ...listEnvelope.data.data.items[0],
      descriptionHtml: '<p>Hello</p>',
      descriptionText: 'Hello',
      benefits: [],
      tags: [],
      companyIndustry: null,
      companySize: null,
    };
    getMock.mockResolvedValue({ data: { data: detail } });

    await expect(jobsService.getJob('job-1')).resolves.toEqual(detail);
    expect(getMock).toHaveBeenCalledWith('/jobs/job-1', { signal: undefined });
  });

  it('maps 404 responses to JobNotFoundError', async () => {
    getMock.mockRejectedValue(
      new axios.AxiosError('Not Found', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: {} as never,
        data: {},
      }),
    );

    await expect(jobsService.getJob('missing')).rejects.toBeInstanceOf(JobNotFoundError);
  });
});
