import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { JobFeedPage } from './JobFeedPage';

const { listJobsMock } = vi.hoisted(() => ({
  listJobsMock: vi.fn(),
}));

vi.mock('@/features/jobs/services/jobs.service', () => ({
  jobsService: {
    listJobs: listJobsMock,
  },
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <JobFeedPage />
    </QueryClientProvider>,
  );
}

const apiJobs = {
  items: [
    {
      id: 'job-ms',
      title: 'Senior Frontend Engineer',
      company: { slug: 'microsoft', name: 'Microsoft', logoUrl: null, verified: true },
      location: { formatted: 'Bangalore, India', remoteType: 'REMOTE' },
      employmentType: 'FULL_TIME',
      salary: { minimum: 18, maximum: 28, currency: 'INR' },
      skills: ['React', 'TypeScript'],
      publishedAt: '2026-07-30T00:00:00.000Z',
      expiresAt: null,
      applyUrl: 'https://careers.microsoft.com/1',
    },
    {
      id: 'job-google',
      title: 'Frontend Engineer',
      company: { slug: 'google', name: 'Google', logoUrl: null, verified: true },
      location: { formatted: 'Bangalore, India', remoteType: 'ONSITE' },
      employmentType: 'FULL_TIME',
      salary: { minimum: 20, maximum: 30, currency: 'INR' },
      skills: ['React'],
      publishedAt: '2026-07-29T00:00:00.000Z',
      expiresAt: null,
      applyUrl: null,
    },
    {
      id: 'job-stripe',
      title: 'Full Stack Developer',
      company: { slug: 'stripe', name: 'Stripe', logoUrl: null, verified: true },
      location: { formatted: 'Bengaluru, India', remoteType: 'REMOTE' },
      employmentType: 'FULL_TIME',
      salary: { minimum: 22, maximum: 40, currency: 'INR' },
      skills: ['React', 'Node.js'],
      publishedAt: '2026-07-28T00:00:00.000Z',
      expiresAt: null,
      applyUrl: 'https://stripe.com/jobs/1',
    },
  ],
  pagination: {
    page: 1,
    limit: 50,
    totalItems: 3,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

beforeEach(() => {
  listJobsMock.mockReset();
  listJobsMock.mockResolvedValue(apiJobs);
});

describe('JobFeedPage', () => {
  it('loads jobs from the API and renders server titles without fake match/actions', async () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /job feed/i })).toBeInTheDocument();
    expect(await screen.findByText(/microsoft/i)).toBeInTheDocument();
    expect(screen.getByText(/google/i)).toBeInTheDocument();
    expect(listJobsMock).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /apply now/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/% Match/i)).not.toBeInTheDocument();
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

  it('filters loaded jobs by remote tag', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText(/microsoft/i);
    await user.click(screen.getByRole('button', { name: /^remote$/i }));

    expect(screen.getByRole('button', { name: /^remote$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/microsoft/i)).toBeInTheDocument();
    expect(screen.getByText(/stripe/i)).toBeInTheDocument();
    expect(screen.queryByText(/google/i)).not.toBeInTheDocument();
  });
});
