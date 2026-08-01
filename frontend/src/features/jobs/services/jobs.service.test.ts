import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JobNotFoundError, jobsService } from './jobs.service';

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

  it('rejects unexpected response shapes', async () => {
    getMock.mockResolvedValue({ data: { ok: true } });
    await expect(jobsService.listJobs()).rejects.toThrow(/unexpected jobs response/i);
  });

  it('propagates transport failures', async () => {
    const failure = new Error('network down');
    getMock.mockRejectedValue(failure);
    await expect(jobsService.listJobs()).rejects.toBe(failure);
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
    expect(getMock).toHaveBeenCalledWith('/jobs/job-1');
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
