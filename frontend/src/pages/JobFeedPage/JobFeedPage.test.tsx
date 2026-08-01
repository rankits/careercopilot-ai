import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JobFeedPage } from './JobFeedPage';

const { listJobsMock } = vi.hoisted(() => ({
  listJobsMock: vi.fn(),
}));

vi.mock('@/features/jobs/services/jobs.service', () => ({
  jobsService: {
    listJobs: listJobsMock,
  },
}));

vi.mock('@/features/applications/services/applications.service', () => ({
  applicationsService: {
    listSavedJobs: vi.fn().mockResolvedValue([]),
    saveJob: vi.fn(),
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
});

const expectListJobsCalledWith = (params: Record<string, unknown>) => {
  expect(listJobsMock).toHaveBeenCalledWith(
    expect.objectContaining(params),
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
};

describe('JobFeedPage', () => {
  it('loads jobs from the API with URL-driven params', async () => {
    renderPage();

    expect(await screen.findByText(/microsoft/i)).toBeInTheDocument();
    expectListJobsCalledWith({ page: 1, limit: 20, sortBy: 'newest' });
    expect(screen.getByText(/2 jobs found/i)).toBeInTheDocument();
    const applyButtons = screen.getAllByRole('button', { name: /apply now/i });
    expect(applyButtons[0]).toBeEnabled();
    expect(applyButtons[1]).toBeDisabled();
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

    expect(await screen.findByRole('alert')).toHaveTextContent(/jobs service unavailable/i);

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

    fireEvent.change(screen.getByPlaceholderText(/search title, company/i), {
      target: { value: 'go' },
    });

    expect(screen.getByText(/searching/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/search jobs/i)).toHaveAttribute('aria-busy', 'true');
  });
});
