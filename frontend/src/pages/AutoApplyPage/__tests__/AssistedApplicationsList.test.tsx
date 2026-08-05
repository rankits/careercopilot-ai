import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { useSubmissions } from '@/features/auto-apply/hooks/useSubmissions';

import { AssistedApplicationsList } from '../AssistedApplicationsList';

vi.mock('@/features/auto-apply/hooks/useSubmissions', () => ({
  useSubmissions: vi.fn(),
}));

function renderList(initialPath = '/auto-apply?tab=submissions') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<AssistedApplicationsList />} path="/auto-apply" />
          <Route element={<div>Workspace</div>} path="/assisted-apply/:jobApplicationId" />
          <Route element={<div>Jobs</div>} path="/jobs-feed" />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Skipped: see docs/assisted-apply-skipped-tests.md */
describe.skip('AssistedApplicationsList (AA-080)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders plain-language status chips and Resume for OPENED', () => {
    vi.mocked(useSubmissions).mockReturnValue({
      data: [
        {
          id: 'app-1',
          status: 'ACTION_REQUIRED',
          jobTitle: 'Engineer',
          companySlug: 'acme',
          updatedAt: '2026-08-06T10:00:00Z',
        },
      ],
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    renderList();
    expect(screen.getByText('Application opened')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue to apply' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(screen.queryByText('Processing…')).not.toBeInTheDocument();
  });

  it('shows empty state with Browse jobs CTA', () => {
    vi.mocked(useSubmissions).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    renderList();
    expect(
      screen.getByText("You haven't started any assisted applications yet."),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse jobs' })).toHaveAttribute('href', '/jobs-feed');
  });

  it('shows error with Retry', async () => {
    const refetch = vi.fn();
    vi.mocked(useSubmissions).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isFetching: false,
      refetch,
    } as any);

    renderList();
    expect(screen.getByText("We couldn't load your applications.")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalled();
  });
});
