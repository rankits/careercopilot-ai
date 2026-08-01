import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useJobFeed } from './useJobFeed';

const { listJobsMock } = vi.hoisted(() => ({
  listJobsMock: vi.fn(),
}));

vi.mock('@/features/jobs/services/jobs.service', () => ({
  jobsService: {
    listJobs: listJobsMock,
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useJobFeed', () => {
  beforeEach(() => {
    listJobsMock.mockReset();
  });

  it('maps listed jobs into cards via the DTO mapper', async () => {
    listJobsMock.mockResolvedValue({
      items: [
        {
          id: 'job-1',
          title: 'Frontend Engineer',
          company: { slug: 'acme', name: 'Acme', logoUrl: null, verified: true },
          location: { formatted: 'Remote', remoteType: 'REMOTE' },
          employmentType: 'FULL_TIME',
          salary: { minimum: null, maximum: null, currency: null },
          skills: ['React'],
          publishedAt: null,
          applyUrl: 'https://acme.test/1',
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

    const { result } = renderHook(() => useJobFeed({ page: 1, sortBy: 'newest' }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listJobsMock).toHaveBeenCalledWith({ page: 1, sortBy: 'newest' });
    expect(result.current.data?.cards[0]).toMatchObject({
      id: 'job-1',
      title: 'Frontend Engineer',
      company: 'Acme',
      applyUrl: 'https://acme.test/1',
    });
    expect(result.current.data?.cards[0].match).toBeUndefined();
  });

  it('surfaces service errors to the hook consumer', async () => {
    listJobsMock.mockRejectedValue(new Error('Jobs unavailable'));
    const { result } = renderHook(() => useJobFeed(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error('Jobs unavailable'));
  });
});
