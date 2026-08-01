import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useApplications, type ApplicationListFilters } from './useApplications';

const { listMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
}));

vi.mock('@/features/auth/utils/authSession', () => ({
  hasAuthSession: () => true,
}));

vi.mock('../services/applications.service', () => ({
  applicationsService: {
    list: listMock,
  },
}));

const baseFilters: ApplicationListFilters = {
  activeTab: 'all',
  archiveFilter: 'active',
  currentPage: 1,
  pageSize: '10',
  searchQuery: '',
  sortBy: 'recently-updated',
  statusFilter: 'all',
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useApplications', () => {
  beforeEach(() => {
    vi.useFakeTimers();

    listMock.mockResolvedValue({
      items: [],
      pagination: {
        page: 1,
        totalItems: 0,
        totalPages: 1,
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('does not refetch when the search input is whitespace only', async () => {
    const { rerender } = renderHook(({ filters }) => useApplications(filters), {
      initialProps: { filters: baseFilters },
      wrapper: createWrapper(),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(listMock).toHaveBeenCalledTimes(1);

    rerender({ filters: { ...baseFilters, searchQuery: '   ' } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(listMock).toHaveBeenCalledTimes(1);
  });

  it('refetches after debounce when the trimmed search changes', async () => {
    const { rerender } = renderHook(({ filters }) => useApplications(filters), {
      initialProps: { filters: baseFilters },
      wrapper: createWrapper(),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(listMock).toHaveBeenCalledTimes(1);

    rerender({ filters: { ...baseFilters, searchQuery: 'Stripe' } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(listMock).toHaveBeenCalledTimes(2);
    expect(listMock).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'Stripe' }));
  });
});
