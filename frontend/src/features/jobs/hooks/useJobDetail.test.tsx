import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JobNotFoundError } from '@/features/jobs/services/jobs.service';

import { useJobDetail } from './useJobDetail';

const { getJobMock } = vi.hoisted(() => ({
  getJobMock: vi.fn(),
}));

vi.mock('@/features/jobs/services/jobs.service', async () => {
  const actual = await vi.importActual('@/features/jobs/services/jobs.service');
  return {
    ...(actual as object),
    jobsService: {
      ...(actual as { jobsService: object }).jobsService,
      getJob: getJobMock,
    },
  };
});

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useJobDetail', () => {
  beforeEach(() => {
    getJobMock.mockReset();
  });

  it('does not fetch when jobId is missing', () => {
    const { result } = renderHook(() => useJobDetail(undefined), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(getJobMock).not.toHaveBeenCalled();
  });

  it('loads job detail for a given id', async () => {
    getJobMock.mockResolvedValue({
      id: 'job-1',
      title: 'Backend Engineer',
      company: { slug: 'acme', name: 'Acme', logoUrl: null, verified: true },
      location: { formatted: 'Remote', remoteType: 'REMOTE' },
      employmentType: 'FULL_TIME',
      salary: { minimum: null, maximum: null, currency: null },
      skills: [],
      publishedAt: null,
      applyUrl: null,
      descriptionHtml: '<p>Hi</p>',
      descriptionText: 'Hi',
      benefits: [],
      tags: [],
      companyIndustry: null,
      companySize: null,
    });

    const { result } = renderHook(() => useJobDetail('job-1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getJobMock).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({ signal: expect.any(AbortSignal) as AbortSignal }),
    );
    expect(result.current.data?.title).toBe('Backend Engineer');
  });

  it('does not retry JobNotFoundError', async () => {
    getJobMock.mockRejectedValue(new JobNotFoundError());
    const { result } = renderHook(() => useJobDetail('missing'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(JobNotFoundError);
    expect(getJobMock).toHaveBeenCalledTimes(1);
  });

  it('retries transient errors once before giving up', async () => {
    getJobMock.mockRejectedValue(new Error('network blip'));
    const { result } = renderHook(() => useJobDetail('job-1'), { wrapper });

    // The default retry delay (~1s) can exceed waitFor's 1s default, so give it room.
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
    // A transient error should trigger the bounded retry (at least one retry).
    expect(getJobMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
