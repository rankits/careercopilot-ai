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
    ? (payload.pagination as unknown as JobListResult['pagination'])
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

export type JobsRequestOptions = {
  signal?: AbortSignal;
};

const isCanceledError = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) return false;
  return (
    error.code === 'ERR_CANCELED' ||
    error.name === 'CanceledError' ||
    error.name === 'AbortError' ||
    axios.isCancel(error)
  );
};

export const normalizeJobsError = (error: unknown): Error => {
  if (isCanceledError(error)) {
    return error instanceof Error ? error : new Error('Request canceled');
  }

  if (axios.isAxiosError(error)) {
    if (error.response?.status === 404) {
      const payload: unknown = error.response.data;
      const message =
        isRecord(payload) && typeof payload.message === 'string'
          ? payload.message
          : 'Job not found';
      return new JobNotFoundError(message);
    }
    if (error.response?.status === 401) {
      return new Error('Your session has expired. Please sign in again.');
    }
    if (error.code === 'ECONNABORTED') {
      return new Error('The request timed out. Please check your connection and try again.');
    }
    if (!error.response) {
      return new Error('Unable to reach the jobs service. Check your connection and try again.');
    }
    const payload: unknown = error.response.data;
    if (isRecord(payload) && typeof payload.message === 'string') {
      return new Error(payload.message);
    }
    if (error.response.status >= 500) {
      return new Error('The jobs service is temporarily unavailable. Please try again.');
    }
  }

  return error instanceof Error ? error : new Error('Unable to load jobs.');
};

export const jobsService = {
  async listJobs(
    params: ListJobsParams = {},
    options: JobsRequestOptions = {},
  ): Promise<JobListResult> {
    try {
      const response = await httpClient.get('/jobs', {
        signal: options.signal,
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
          ...(params.currency ? { currency: params.currency } : {}),
        },
      });
      return unwrapListPayload(response);
    } catch (error) {
      throw normalizeJobsError(error);
    }
  },

  async getJob(jobId: string, options: JobsRequestOptions = {}): Promise<JobDetailDto> {
    try {
      const response = await httpClient.get(`/jobs/${jobId}`, { signal: options.signal });
      if (!isRecord(response) || !isRecord(response.data) || !isRecord(response.data.data)) {
        throw new Error('Unexpected job detail response shape');
      }
      return response.data.data as unknown as JobDetailDto;
    } catch (error) {
      throw normalizeJobsError(error);
    }
  },
};
