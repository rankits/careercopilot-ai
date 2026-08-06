import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useApplications, type ApplicationListFilters } from './useApplications';

const { listMock, hasAuthMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
  hasAuthMock: vi.fn(() => true),
}));

vi.mock('@/features/auth/utils/authSession', () => ({
  hasAuthSession: hasAuthMock,
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

  it('sorts records by priority when requested', async () => {
    listMock.mockResolvedValue({
      items: [
        {
          id: 'a1',
          companyName: 'LowCo',
          currentStatus: 'SAVED',
          jobTitle: 'X',
          priority: 'LOW',
          location: 'Remote',
          primarySourceType: 'PLATFORM_APPLY',
        },
        {
          id: 'a2',
          companyName: 'HighCo',
          currentStatus: 'SAVED',
          jobTitle: 'Y',
          priority: 'HIGH',
          location: 'Remote',
          primarySourceType: 'PLATFORM_APPLY',
        },
        {
          id: 'a3',
          companyName: 'MedCo',
          currentStatus: 'SAVED',
          jobTitle: 'Z',
          priority: 'MEDIUM',
          location: 'Remote',
          primarySourceType: 'PLATFORM_APPLY',
        },
      ],
      pagination: { page: 1, totalItems: 3, totalPages: 1 },
    });

    const { result } = renderHook(({ filters }) => useApplications(filters), {
      initialProps: { filters: { ...baseFilters, sortBy: 'priority' } },
      wrapper: createWrapper(),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.data?.records.map((record) => record.company)).toEqual([
      'HighCo',
      'MedCo',
      'LowCo',
    ]);
  });

  it('does not fetch when the auth session is missing', async () => {
    hasAuthMock.mockReturnValue(false);

    renderHook(() => useApplications(baseFilters), { wrapper: createWrapper() });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(listMock).not.toHaveBeenCalled();
  });
});
