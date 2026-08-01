import axios from 'axios';

import type {
  JobDetailDto,
  JobListDto,
  JobListResult,
  ListJobsParams,
} from '@/features/jobs/types/job.types';
import { httpClient } from '@/services/httpClient';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const unwrapListPayload = (response: unknown): JobListResult => {
  if (!isRecord(response) || !isRecord(response.data) || !isRecord(response.data.data)) {
    throw new Error('Unexpected jobs response shape');
  }

  const payload = response.data.data;
  const items = Array.isArray(payload.items) ? (payload.items as JobListDto[]) : [];
  const pagination = isRecord(payload.pagination)
    ? (payload.pagination as JobListResult['pagination'])
    : {
        page: 1,
        limit: items.length,
        totalItems: items.length,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };

  return { items, pagination };
};

export class JobNotFoundError extends Error {
  constructor(message = 'Job not found') {
    super(message);
    this.name = 'JobNotFoundError';
  }
}

export const jobsService = {
  async listJobs(params: ListJobsParams = {}): Promise<JobListResult> {
    const response = await httpClient.get('/jobs', {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        sortBy: params.sortBy ?? 'newest',
        ...(params.query ? { query: params.query } : {}),
        ...(params.location ? { location: params.location } : {}),
        ...(params.remoteTypes ? { remoteTypes: params.remoteTypes } : {}),
        ...(params.employmentTypes ? { employmentTypes: params.employmentTypes } : {}),
        ...(params.skills ? { skills: params.skills } : {}),
        ...(params.minSalary !== undefined ? { minSalary: params.minSalary } : {}),
        ...(params.maxSalary !== undefined ? { maxSalary: params.maxSalary } : {}),
      },
    });
    return unwrapListPayload(response);
  },

  async getJob(jobId: string): Promise<JobDetailDto> {
    try {
      const response = await httpClient.get(`/jobs/${jobId}`);
      if (!isRecord(response) || !isRecord(response.data) || !isRecord(response.data.data)) {
        throw new Error('Unexpected job detail response shape');
      }
      return response.data.data as JobDetailDto;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new JobNotFoundError();
      }
      throw error;
    }
  },
};
