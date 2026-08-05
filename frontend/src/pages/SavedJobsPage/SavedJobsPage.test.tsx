import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type * as ReactQueryNS from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/organisms/Toast/ToastProvider';

import type * as UseSaveJobModule from '@/features/applications/hooks/useSaveJob';

import type { ApplicationDto } from '@/features/applications/types/application.types';

import { SavedJobsPage } from './SavedJobsPage';

const { listSavedJobsMock, unsaveJobMock, useQueryOverride } = vi.hoisted(() => ({
  listSavedJobsMock: vi.fn(),
  unsaveJobMock: vi.fn(),
  useQueryOverride: { current: null as null | Record<string, unknown> },
}));

vi.mock('@/features/applications/services/applications.service', () => ({
  applicationsService: {
    listSavedJobs: listSavedJobsMock,
  },
}));

vi.mock('@/features/applications/hooks/useSaveJob', async () => {
  const actual = await vi.importActual<typeof UseSaveJobModule>(
    '@/features/applications/hooks/useSaveJob',
  );
  return {
    ...actual,
    useSaveJob: () => ({
      isSaving: false,
      saveJob: vi.fn(),
      unsaveJob: unsaveJobMock,
    }),
  };
});

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactQueryNS>();
  return {
    ...actual,
    useQuery: (options: unknown) => {
      if (useQueryOverride.current) {
        return useQueryOverride.current;
      }
      return actual.useQuery(options as never);
    },
  };
});

function savedJob(overrides: Partial<ApplicationDto> = {}): ApplicationDto {
  return {
    appliedAt: null,
    archivedAt: null,
    closedAt: null,
    companyId: null,
    companyLogoUrl: null,
    companyName: 'Acme',
    createdAt: '2026-08-01T00:00:00.000Z',
    currentStatus: 'SAVED',
    employmentType: null,
    firstResponseAt: null,
    id: 'app-1',
    interestLevel: null,
    jobId: 'job-1',
    jobTitle: 'Frontend Engineer',
    location: null,
    originalJobUrl: null,
    primarySourceType: 'MANUAL',
    priority: 'MEDIUM',
    remoteType: 'REMOTE',
    salaryCurrency: null,
    salaryMax: null,
    salaryMin: null,
    salaryPeriod: null,
    updatedAt: '2026-08-01T00:00:00.000Z',
    userId: 'user-1',
    ...overrides,
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/saved-jobs']}>
          <Routes>
            <Route path="/saved-jobs" element={<SavedJobsPage />} />
            <Route path="/jobs-feed" element={<p>Job feed</p>} />
            <Route path="/jobs/:jobId" element={<p>Job detail</p>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('SavedJobsPage', () => {
  beforeEach(() => {
    listSavedJobsMock.mockReset();
    unsaveJobMock.mockReset();
    unsaveJobMock.mockResolvedValue(undefined);
    useQueryOverride.current = null;
  });

  afterEach(() => {
    useQueryOverride.current = null;
  });

  it('shows a loading indicator while fetching', () => {
    listSavedJobsMock.mockImplementation(() => new Promise(() => undefined));
    renderPage();
    expect(screen.getByLabelText(/loading saved jobs/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /saved jobs/i })).toBeInTheDocument();
  });

  it('shows empty state and links to the job feed', async () => {
    const user = userEvent.setup();
    listSavedJobsMock.mockResolvedValueOnce([]);
    renderPage();

    expect(await screen.findByRole('status')).toHaveTextContent(/no saved jobs yet/i);
    await user.click(screen.getByRole('link', { name: /browse jobs/i }));
    expect(screen.getByText('Job feed')).toBeInTheDocument();
  });

  it('renders saved jobs and opens detail with the same navigation as Job Feed', async () => {
    const user = userEvent.setup();
    listSavedJobsMock.mockResolvedValueOnce([
      savedJob({ id: 'a1', jobTitle: 'Frontend Engineer', companyName: 'Acme', jobId: 'job-1' }),
      savedJob({
        id: 'a2',
        jobTitle: 'Manual entry',
        companyName: 'Beta',
        jobId: null,
      }),
    ]);
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Frontend Engineer' })).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Manual entry' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view frontend engineer/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /view frontend engineer/i }));
    expect(screen.getByText('Job detail')).toBeInTheDocument();
  });

  it('unsaves a job optimistically and shows a toast', async () => {
    const user = userEvent.setup();
    listSavedJobsMock.mockResolvedValue([savedJob()]);
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Frontend Engineer' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /unsave frontend engineer/i }));

    await waitFor(() => expect(unsaveJobMock).toHaveBeenCalledWith('job-1'));
    expect(await screen.findByText(/removed from saved jobs/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Frontend Engineer' })).not.toBeInTheDocument();
  });

  it('shows Error message and retries', async () => {
    const user = userEvent.setup();
    listSavedJobsMock
      .mockRejectedValueOnce(new Error('Saved jobs service down'))
      .mockResolvedValueOnce([savedJob()]);

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(/saved jobs service down/i);
    await user.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByRole('heading', { name: 'Frontend Engineer' })).toBeInTheDocument();
    expect(listSavedJobsMock).toHaveBeenCalledTimes(2);
  });

  it('shows a fallback message when the query rejects a non-Error', async () => {
    listSavedJobsMock.mockRejectedValueOnce('boom');
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(/unable to load saved jobs/i);
  });

  it('hides Retry while isFetching is true', () => {
    useQueryOverride.current = {
      data: undefined,
      error: new Error('temp'),
      isPending: false,
      isError: true,
      isFetching: true,
      refetch: vi.fn(),
    };

    renderPage();
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('covers empty data length via undefined data', () => {
    useQueryOverride.current = {
      data: undefined,
      error: null,
      isPending: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    };

    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent(/no saved jobs yet/i);
  });
});
