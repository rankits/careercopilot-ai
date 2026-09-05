import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JobFeedPage } from './JobFeedPage';

const { listJobsMock, listSavedJobsMock, saveJobMock } = vi.hoisted(() => ({
  listJobsMock: vi.fn(),
  listSavedJobsMock: vi.fn(),
  saveJobMock: vi.fn(),
}));

vi.mock('@/features/jobs/services/jobs.service', () => ({
  jobsService: {
    listJobs: listJobsMock,
  },
}));

vi.mock('@/features/applications/services/applications.service', () => ({
  applicationsService: {
    listSavedJobs: listSavedJobsMock,
    saveJob: saveJobMock,
    unsaveJob: vi.fn(),
  },
}));

function renderPage(initialEntry = '/jobs-feed') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <JobFeedPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const apiJobs = {
  items: [
    {
      id: 'job-ms',
      title: 'Senior Frontend Engineer',
      company: { slug: 'microsoft', name: 'Microsoft', logoUrl: null, verified: true },
      location: { formatted: 'Remote', remoteType: 'REMOTE' },
      employmentType: 'FULL_TIME',
      salary: { minimum: 18, maximum: 28, currency: 'INR' },
      skills: ['React', 'TypeScript'],
      publishedAt: '2026-07-30T00:00:00.000Z',
      applyUrl: 'https://careers.microsoft.com/1',
      isSaved: true,
    },
    {
      id: 'job-google',
      title: 'Frontend Engineer',
      company: { slug: 'google', name: 'Google', logoUrl: null, verified: true },
      location: { formatted: 'On-site', remoteType: 'ONSITE' },
      employmentType: 'FULL_TIME',
      salary: { minimum: 20, maximum: 30, currency: 'INR' },
      skills: ['React'],
      publishedAt: '2026-07-29T00:00:00.000Z',
      applyUrl: null,
    },
  ],
  pagination: {
    page: 1,
    limit: 20,
    totalItems: 2,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

beforeEach(() => {
  listJobsMock.mockReset();
  listJobsMock.mockResolvedValue(apiJobs);
  listSavedJobsMock.mockReset();
  listSavedJobsMock.mockResolvedValue([]);
  saveJobMock.mockReset();
  saveJobMock.mockResolvedValue(undefined);
});

const expectListJobsCalledWith = (params: Record<string, unknown>) => {
  expect(listJobsMock).toHaveBeenCalledWith(
    expect.objectContaining(params),
    expect.objectContaining({ signal: expect.any(AbortSignal) as AbortSignal }),
  );
};

describe('JobFeedPage', () => {
  it('loads jobs from the API with URL-driven params', async () => {
    renderPage();

    expect(await screen.findByText(/microsoft/i)).toBeInTheDocument();
    expectListJobsCalledWith({ page: 1, limit: 20, sortBy: 'newest' });
    expect(listSavedJobsMock).not.toHaveBeenCalled();
    expect(screen.getByText(/2 jobs found/i)).toBeInTheDocument();
    const applyButtons = screen.getAllByRole('button', { name: /apply to/i });
    expect(applyButtons[0]).toBeEnabled();
    expect(applyButtons[1]).toBeDisabled();
  });

  it('saves a job without loading the saved applications list', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText(/microsoft/i)).toBeInTheDocument();
    expect(listSavedJobsMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /save frontend engineer/i }));

    await waitFor(() => {
      expect(saveJobMock).toHaveBeenCalledWith('job-google');
    });
    expect(listSavedJobsMock).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /unsave frontend engineer/i })).toBeInTheDocument();
  });

  it('shows saved state from the job list API without calling listSavedJobs', async () => {
    renderPage();

    expect(await screen.findByText(/microsoft/i)).toBeInTheDocument();
    expect(listSavedJobsMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: /unsave senior frontend engineer/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save frontend engineer/i })).toBeInTheDocument();
  });

  it('updates workMode in the request when a filter is selected', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/microsoft/i);

    await user.click(screen.getByRole('button', { name: /^remote$/i }));

    await waitFor(() => {
      expectListJobsCalledWith({ remoteTypes: 'REMOTE', page: 1 });
    });
  });

  it('shows error UI with retry when the jobs API fails', async () => {
    listJobsMock.mockRejectedValueOnce(new Error('Jobs service unavailable'));
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(/unable to load jobs/i);
    expect(screen.getByRole('alert')).toHaveTextContent(/temporarily unavailable/i);

    listJobsMock.mockResolvedValueOnce(apiJobs);
    await user.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText(/microsoft/i)).toBeInTheDocument();
    });
  });

  it('restores filters from the URL on load', async () => {
    renderPage('/jobs-feed?workMode=remote&sortBy=salaryHighToLow');
    await screen.findByText(/microsoft/i);

    expectListJobsCalledWith({
      remoteTypes: 'REMOTE',
      sortBy: 'salaryHighToLow',
    });
  });

  it('shows active filter chips and clears all filters', async () => {
    const user = userEvent.setup();
    renderPage('/jobs-feed?workMode=remote&query=react&sortBy=salaryHighToLow');
    await screen.findByText(/microsoft/i);

    const chips = screen.getByLabelText(/active filters/i);
    expect(within(chips).getByText(/search: react/i)).toBeInTheDocument();
    expect(within(chips).getByText(/^remote$/i)).toBeInTheDocument();
    expect(within(chips).getByText(/salary: high to low/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /clear all/i }));

    await waitFor(() => {
      expectListJobsCalledWith({ page: 1, sortBy: 'newest' });
    });
    expect(screen.queryByLabelText(/active filters/i)).not.toBeInTheDocument();
  });

  it('shows a searching indicator while the draft query differs from the URL', async () => {
    renderPage();
    await screen.findByText(/microsoft/i);

    fireEvent.change(screen.getByPlaceholderText(/search jobs, companies, or keywords/i), {
      target: { value: 'go' },
    });

    expect(screen.getByText(/searching/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/search jobs/i)).toHaveAttribute('aria-busy', 'true');
  });

  it('debounces search so rapid keystrokes do not call the API per character', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderPage();
    await screen.findByText(/microsoft/i);
    const initialCalls = listJobsMock.mock.calls.length;

    const input = screen.getByPlaceholderText(/search jobs, companies, or keywords/i);
    fireEvent.change(input, { target: { value: 'r' } });
    fireEvent.change(input, { target: { value: 're' } });
    fireEvent.change(input, { target: { value: 'react' } });

    expect(listJobsMock.mock.calls.length).toBe(initialCalls);

    await vi.advanceTimersByTimeAsync(399);
    expect(listJobsMock.mock.calls.length).toBe(initialCalls);

    await vi.advanceTimersByTimeAsync(1);
    await waitFor(() => {
      expectListJobsCalledWith({ query: 'react', page: 1 });
    });
    expect(listJobsMock.mock.calls.length).toBe(initialCalls + 1);

    vi.useRealTimers();
  });

  it('keeps the filter toolbar zones available for search, chips, and controls', async () => {
    renderPage('/jobs-feed?workMode=remote');
    await screen.findByText(/microsoft/i);

    expect(screen.getByLabelText(/search jobs/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/job filters/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /all salary/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^newest$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
  });
});
