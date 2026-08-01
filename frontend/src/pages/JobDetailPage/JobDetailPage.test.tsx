import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JobNotFoundError } from '@/features/jobs/services/jobs.service';

import { JobDetailPage } from './JobDetailPage';

const { getJobMock } = vi.hoisted(() => ({
  getJobMock: vi.fn(),
}));

vi.mock('@/features/jobs/services/jobs.service', async () => {
  const actual = await vi.importActual<typeof import('@/features/jobs/services/jobs.service')>(
    '@/features/jobs/services/jobs.service',
  );
  return {
    ...actual,
    jobsService: {
      ...actual.jobsService,
      getJob: getJobMock,
    },
  };
});

function renderDetail(jobId = 'job-1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/jobs/${jobId}`]}>
        <Routes>
          <Route path="/jobs/:jobId" element={<JobDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  getJobMock.mockReset();
});

describe('JobDetailPage', () => {
  it('renders job details for an ACTIVE job', async () => {
    getJobMock.mockResolvedValue({
      id: 'job-1',
      title: 'Backend Engineer',
      company: { slug: 'acme', name: 'Acme', logoUrl: null, verified: true },
      location: { formatted: 'Remote', remoteType: 'REMOTE' },
      employmentType: 'FULL_TIME',
      salary: { minimum: null, maximum: null, currency: null },
      skills: ['Go'],
      publishedAt: null,
      applyUrl: null,
      descriptionHtml: '<p>Build APIs</p><script>alert(1)</script>',
      descriptionText: 'Build APIs',
      benefits: [],
      tags: [],
      companyIndustry: null,
      companySize: null,
    });

    renderDetail();

    expect(await screen.findByRole('heading', { name: /backend engineer/i })).toBeInTheDocument();
    expect(screen.getByText(/acme/i)).toBeInTheDocument();
    expect(screen.getByText(/build apis/i)).toBeInTheDocument();
    expect(document.body.innerHTML).not.toMatch(/<script>/i);
    expect(screen.getByRole('button', { name: /apply now/i })).toBeDisabled();
  });

  it('opens a safe apply URL in a new tab', async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, 'open').mockReturnValue({ opener: window } as Window);
    getJobMock.mockResolvedValue({
      id: 'job-1',
      title: 'Backend Engineer',
      company: { slug: 'acme', name: 'Acme', logoUrl: null, verified: true },
      location: { formatted: 'Remote', remoteType: 'REMOTE' },
      employmentType: 'FULL_TIME',
      salary: { minimum: null, maximum: null, currency: null },
      skills: [],
      publishedAt: null,
      applyUrl: 'https://careers.acme.test/apply/1',
      descriptionHtml: '',
      descriptionText: 'Build APIs',
      benefits: [],
      tags: [],
      companyIndustry: null,
      companySize: null,
    });

    renderDetail();
    await screen.findByRole('heading', { name: /backend engineer/i });
    await user.click(screen.getByRole('button', { name: /apply now/i }));

    expect(openSpy).toHaveBeenCalledWith(
      'https://careers.acme.test/apply/1',
      '_blank',
      'noopener,noreferrer',
    );
    openSpy.mockRestore();
  });

  it('shows not-found UI when the API returns 404', async () => {
    getJobMock.mockRejectedValue(new JobNotFoundError());
    renderDetail('missing');

    expect(await screen.findByRole('heading', { name: /job not found/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/no longer available/i)).toBeInTheDocument();
    });
  });
});
