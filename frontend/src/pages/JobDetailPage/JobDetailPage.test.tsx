import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JobNotFoundError } from '@/features/jobs/services/jobs.service';

import { JobDetailPage } from './JobDetailPage';

const { getJobMock, similarMock, trackAndOpenApplyMock } = vi.hoisted(() => ({
  getJobMock: vi.fn(),
  similarMock: vi.fn(),
  trackAndOpenApplyMock: vi.fn(),
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

vi.mock('@/features/recommendations/services/recommendations.service', () => ({
  recommendationsService: {
    getSimilarJobs: similarMock,
  },
}));

vi.mock('@/features/auto-apply/hooks/useTrackAndOpenApply', () => ({
  useTrackAndOpenApply: () => ({
    trackAndOpenApply: trackAndOpenApplyMock,
    isPending: false,
  }),
}));

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
  similarMock.mockReset();
  trackAndOpenApplyMock.mockReset();
  trackAndOpenApplyMock.mockResolvedValue(undefined);
});

const baseJob = {
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
};

const scoreResult = (overallScore: number) => ({
  overallScore,
  components: {},
  matchedSkills: [],
  aliasSkills: [],
  relatedSkills: [],
  transferableSkills: [],
  missingSkills: [],
  reasons: [],
});

describe('JobDetailPage', () => {
  it('renders job details for an ACTIVE job', async () => {
    getJobMock.mockResolvedValue(baseJob);

    renderDetail();

    expect(await screen.findByRole('heading', { name: /backend engineer/i })).toBeInTheDocument();
    expect(screen.getByText(/acme · remote/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/job attributes/i)).toHaveTextContent(/full time/i);
    expect(screen.getByLabelText(/job attributes/i)).toHaveTextContent(/remote/i);
    expect(screen.getByLabelText(/job attributes/i)).toHaveTextContent(/verified/i);
    expect(screen.getByText(/not disclosed/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /about this role/i })).toBeInTheDocument();
    expect(screen.getByText(/build apis/i)).toBeInTheDocument();
    expect(document.body.innerHTML).not.toMatch(/<script>/i);
    expect(screen.getByRole('button', { name: /apply now/i })).toBeDisabled();
  });


  it('shows Apply Now and Assisted Apply without Prepare Application (AA-003)', async () => {
    getJobMock.mockResolvedValue({
      ...baseJob,
      applyUrl: 'https://careers.acme.test/apply/1',
    });

    renderDetail();
    await screen.findByRole('heading', { name: /backend engineer/i });

    expect(screen.getByRole('button', { name: /^Apply Now$/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /Assisted Apply\. We'll help you prepare and track this application/i,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Prepare Application/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Prepare Application/i)).not.toBeInTheDocument();
  });

  it('calls trackAndOpenApply with ASSISTED mode when Assisted Apply is clicked (AA-003)', async () => {
    const user = userEvent.setup();
    getJobMock.mockResolvedValue({
      ...baseJob,
      applyUrl: 'https://careers.acme.test/apply/1',
    });

    renderDetail();
    await screen.findByRole('heading', { name: /backend engineer/i });

    await user.click(
      screen.getByRole('button', {
        name: /Assisted Apply\. We'll help you prepare and track this application/i,
      }),
    );

    expect(trackAndOpenApplyMock).toHaveBeenCalledTimes(1);
    expect(trackAndOpenApplyMock).toHaveBeenCalledWith({
      jobId: 'job-1',
      applyUrl: 'https://careers.acme.test/apply/1',
      openExternal: false,
      applyMode: 'ASSISTED',
    });
  });

  it('does not call tracking when Apply Now is clicked (AA-003)', async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, 'open').mockReturnValue({ opener: window } as Window);
    getJobMock.mockResolvedValue({
      ...baseJob,
      applyUrl: 'https://careers.acme.test/apply/1',
    });

    renderDetail();
    await screen.findByRole('heading', { name: /backend engineer/i });
    await user.click(screen.getByRole('button', { name: /^Apply Now$/i }));

    expect(trackAndOpenApplyMock).not.toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledWith(
      'https://careers.acme.test/apply/1',
      '_blank',
      'noopener,noreferrer',
    );
    openSpy.mockRestore();
  });

  it('renders HTML descriptions from descriptionText when descriptionHtml is empty', async () => {
    getJobMock.mockResolvedValue({
      ...baseJob,
      descriptionHtml: '',
      descriptionText:
        '<div class="content-intro"><h2>Join us in building the future of finance.</h2><p>Our mission is to democratize finance for all.</p></div>',
    });

    renderDetail();

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: /join us in building the future of finance/i,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/<div class="content-intro"/i)).not.toBeInTheDocument();
  });

  it('shows See more for long descriptions', async () => {
    getJobMock.mockResolvedValue({
      ...baseJob,
      descriptionHtml: '',
      descriptionText: 'Role overview. '.repeat(40),
    });

    renderDetail();

    expect(await screen.findByRole('button', { name: /see more/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /see less/i })).not.toBeInTheDocument();

  });

  it('hides empty structured sections when backend returns unstructured prose', async () => {
    getJobMock.mockResolvedValue({
      ...baseJob,
      employmentType: null,
      company: { ...baseJob.company, verified: false },
      location: { formatted: 'Bucharest, Romania', remoteType: 'ONSITE' },
      skills: ['Remote', 'Sample', 'Senior'],
      descriptionHtml:
        'We are searching for a professional Marketeer. Job benefits: Salary: 5,000-7,000 EUR',
      descriptionText:
        'We are searching for a professional Marketeer. Job benefits: Salary: 5,000-7,000 EUR',
      benefits: [],
    });

    renderDetail();

    expect(await screen.findByRole('heading', { name: /backend engineer/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/job attributes/i)).toHaveTextContent(/on-site/i);
    expect(screen.getByLabelText(/skills/i)).toHaveTextContent(/remote/i);
    expect(screen.queryByRole('heading', { name: /responsibilities/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /requirements/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /benefits/i })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /about this role/i })).toBeInTheDocument();
    expect(screen.getByText(/professional marketeer/i)).toBeInTheDocument();
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

  it('loads similar jobs on explicit click without rendering the source job', async () => {
    const user = userEvent.setup();
    getJobMock.mockResolvedValue(baseJob);
    similarMock.mockResolvedValue([
      {
        rank: 1,
        job: {
          ...baseJob,
          id: 'job-1',
          title: 'Source duplicate',
          applyUrl: 'https://careers.acme.test/source',
        },
        displayScore: 99,
        scoreResult: scoreResult(0.99),
        category: 'BEST_MATCH',
        matchType: 'EXACT',
      },
      {
        rank: 2,
        job: {
          ...baseJob,
          id: 'job-2',
          title: 'Platform Engineer',
          company: { slug: 'beta', name: 'Beta', logoUrl: null, verified: true },
          applyUrl: 'https://careers.beta.test/apply',
        },
        displayScore: 74,
        scoreResult: scoreResult(0.74),
        category: 'STRONG_MATCH',
        matchType: 'RELATED',
      },
    ]);

    renderDetail();
    await screen.findByRole('heading', { name: /backend engineer/i });

    expect(similarMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /find similar/i }));

    expect(await screen.findByText(/platform engineer/i)).toBeInTheDocument();
    expect(screen.getByText(/74% Match/i)).toBeInTheDocument();
    expect(screen.queryByText(/source duplicate/i)).not.toBeInTheDocument();
    expect(similarMock).toHaveBeenCalledWith('job-1', { limit: 6 }, expect.anything());
  });

  it('shows not-found UI when the API returns 404', async () => {
    getJobMock.mockRejectedValue(new JobNotFoundError());
    renderDetail('missing');

    expect(await screen.findByRole('heading', { name: /job not found/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/may have expired/i)).toBeInTheDocument();
    });
  });

  it('renders extracted responsibilities, requirements, and benefits', async () => {
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
      descriptionHtml: '',
      descriptionText: [
        'Intro paragraph.',
        '',
        'Responsibilities',
        '- Build APIs',
        '',
        'Requirements',
        '- Go experience',
      ].join('\n'),
      benefits: ['Health insurance'],
      tags: [],
      companyIndustry: null,
      companySize: null,
    });

    renderDetail();

    expect(await screen.findByRole('heading', { name: /responsibilities/i })).toBeInTheDocument();
    expect(screen.getByText(/build apis/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /requirements/i })).toBeInTheDocument();
    expect(screen.getByText(/go experience/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /benefits/i })).toBeInTheDocument();
    expect(screen.getByText(/health insurance/i)).toBeInTheDocument();
  });
});
