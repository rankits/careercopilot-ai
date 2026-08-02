import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as RecommendationHooks from '@/features/recommendations/hooks/useRecommendations';

import { authReducer } from '@/features/auth/authSlice';

import { ForYouPage } from './ForYouPage';

const {
  listMock,
  generateMock,
  refreshMock,
  generateResumeMock,
  generateTextMock,
  createCareerTargetMock,
  generateCareerGoalMock,
  listSavedSearchesMock,
  createSavedSearchMock,
  deleteSavedSearchMock,
  generateSavedSearchMock,
  listSavedMock,
  saveJobMock,
  unsaveJobMock,
  profileMock,
  readinessMock,
  feedbackMock,
  similarMock,
} = vi.hoisted(() => ({
    listMock: vi.fn(),
    generateMock: vi.fn(),
    refreshMock: vi.fn(),
    generateResumeMock: vi.fn(),
    generateTextMock: vi.fn(),
    createCareerTargetMock: vi.fn(),
    generateCareerGoalMock: vi.fn(),
    listSavedSearchesMock: vi.fn(),
    createSavedSearchMock: vi.fn(),
    deleteSavedSearchMock: vi.fn(),
    generateSavedSearchMock: vi.fn(),
    listSavedMock: vi.fn(),
    saveJobMock: vi.fn(),
    unsaveJobMock: vi.fn(),
    profileMock: vi.fn(),
    readinessMock: vi.fn(),
    feedbackMock: vi.fn(),
    similarMock: vi.fn(),
  }));

vi.mock('@/features/recommendations/services/recommendations.service', () => ({
  recommendationsService: {
    list: listMock,
    generateFromProfile: generateMock,
    refreshFromProfile: refreshMock,
    generateFromResume: generateResumeMock,
    generateFromText: generateTextMock,
    createCareerTarget: createCareerTargetMock,
    generateFromCareerGoal: generateCareerGoalMock,
    listSavedSearches: listSavedSearchesMock,
    createSavedSearch: createSavedSearchMock,
    deleteSavedSearch: deleteSavedSearchMock,
    generateFromSavedSearch: generateSavedSearchMock,
    getReadiness: readinessMock,
    getSimilarJobs: similarMock,
    submitFeedback: feedbackMock,
  },
}));

vi.mock('@/features/recommendations/hooks/useRecommendations', async (importOriginal) => {
  const actual = await importOriginal<typeof RecommendationHooks>();
  return {
    ...actual,
    useRecommendationReadiness: () =>
      readinessMock() as ReturnType<typeof actual.useRecommendationReadiness>,
  };
});

vi.mock('@/features/applications/services/applications.service', () => ({
  applicationsService: {
    listSavedJobs: listSavedMock,
    saveJob: saveJobMock,
    unsaveJob: unsaveJobMock,
  },
}));

vi.mock('@/features/resume/services/resume.service', () => ({
  resumeService: {
    getMyProfile: profileMock,
  },
}));

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

function renderPage(isProfileComplete = true, route = '/for-you') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: { id: 'u1', email: 'a@b.com', name: 'A', role: 'USER', isProfileCreated: true },
        accessToken: 'token',
        isAuthenticated: true,
        isProfileComplete,
        isSessionResolved: true,
        isLoading: false,
        error: null,
      },
    },
  });

  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          <ForYouPage />
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>,
  );
}

beforeEach(() => {
  listMock.mockReset();
  generateMock.mockReset();
  refreshMock.mockReset();
  generateResumeMock.mockReset();
  generateTextMock.mockReset();
  createCareerTargetMock.mockReset();
  generateCareerGoalMock.mockReset();
  listSavedSearchesMock.mockReset();
  createSavedSearchMock.mockReset();
  deleteSavedSearchMock.mockReset();
  generateSavedSearchMock.mockReset();
  similarMock.mockReset();
  feedbackMock.mockReset();
  feedbackMock.mockResolvedValue(undefined);
  profileMock.mockReset();
  readinessMock.mockReset();
  listSavedMock.mockReset();
  listSavedMock.mockResolvedValue([]);
  saveJobMock.mockReset();
  saveJobMock.mockResolvedValue(undefined);
  unsaveJobMock.mockReset();
  unsaveJobMock.mockResolvedValue(undefined);
  listSavedSearchesMock.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });
  refreshMock.mockResolvedValue({
    items: [],
    page: 1,
    limit: 20,
    total: 0,
    run: {
      id: 'run-refresh',
      sourceType: 'PROFILE',
      sourceId: null,
      status: 'COMPLETED',
      lifecycleState: 'READY',
      candidateCount: 0,
      failureCode: null,
      createdAt: '2026-07-30T00:00:00.000Z',
      completedAt: '2026-07-30T00:00:00.000Z',
    },
  });
  readinessMock.mockReturnValue({
    data: {
      canGenerateFromProfile: true,
      blockers: [],
      stale: false,
      ready: true,
      lifecycleState: 'READY',
      retrieval: { configured: true, backend: 'PGVECTOR' },
    },
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  });
});

describe('ForYouPage', () => {
  it('renders recommendation mode tabs with profile selected by default', async () => {
    listMock.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });
    renderPage(true);

    expect(
      await screen.findByRole('tablist', { name: /recommendation modes/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^profile$/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: /resume/i })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(screen.getByRole('tabpanel', { name: /profile/i })).toBeInTheDocument();
  });

  it('moves recommendation tabs with arrow keys', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });
    profileMock.mockResolvedValue(null);
    renderPage(true);

    const profileTab = await screen.findByRole('tab', { name: /^profile$/i });
    profileTab.focus();
    await user.keyboard('{ArrowRight}');

    const resumeTab = screen.getByRole('tab', { name: /resume/i });
    await waitFor(() => expect(resumeTab).toHaveAttribute('aria-selected', 'true'));
    expect(resumeTab).toHaveFocus();
    expect(profileTab).toHaveAttribute('tabindex', '-1');
    expect(resumeTab).toHaveAttribute('tabindex', '0');
  });

  it('opens the Saved tab without loading profile recommendations', async () => {
    const user = userEvent.setup();
    renderPage(true, '/for-you?mode=saved');

    expect(await screen.findByText(/no saved searches yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create saved search/i })).toBeDisabled();
    expect(listMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole('tab', { name: /^profile$/i }));
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(1));
  });

  it('generates text recommendations from pasted target text', async () => {
    const user = userEvent.setup();
    generateTextMock.mockResolvedValue([
      {
        id: 'rec-text-1',
        runId: 'run-text-1',
        rank: 1,
        job: {
          id: 'text-job',
          title: 'Text Matched Backend Engineer',
          company: { slug: 'delta', name: 'Delta', logoUrl: null, verified: true },
          location: { formatted: 'Remote', remoteType: 'REMOTE' },
          employmentType: 'FULL_TIME',
          salary: { minimum: 10, maximum: 20, currency: 'INR' },
          skills: ['Node.js'],
          publishedAt: '2026-07-30T00:00:00.000Z',
          applyUrl: 'https://example.com/apply',
        },
        displayScore: 86,
        scoreResult: scoreResult(0.86),
        category: 'BEST_MATCH',
        matchType: 'EXACT',
        createdAt: '2026-07-30T00:00:00.000Z',
      },
    ]);

    renderPage(true, '/for-you?mode=text-career');

    const textarea = await screen.findByLabelText(/target role text/i);
    await user.type(textarea, 'Remote Node.js backend role');
    await user.click(screen.getByRole('button', { name: /generate from text/i }));

    expect(await screen.findByText(/text matched backend engineer/i)).toBeInTheDocument();
    expect(screen.getByText(/86% Match/i)).toBeInTheDocument();
    expect(generateTextMock).toHaveBeenCalledWith('Remote Node.js backend role');
    expect(listMock).not.toHaveBeenCalled();
  });

  it('creates a career target and groups career goal recommendations by category', async () => {
    const user = userEvent.setup();
    createCareerTargetMock.mockResolvedValue({
      id: 'target-1',
      goalText: 'Move from manual testing into automation QA',
      structured: {},
      createdAt: '2026-08-02T00:00:00.000Z',
      updatedAt: '2026-08-02T00:00:00.000Z',
    });
    generateCareerGoalMock.mockResolvedValue([
      {
        id: 'rec-career-1',
        runId: 'run-career-1',
        rank: 1,
        job: {
          id: 'career-job-1',
          title: 'Automation QA Engineer',
          company: { slug: 'alpha', name: 'Alpha', logoUrl: null, verified: true },
          location: { formatted: 'Remote', remoteType: 'REMOTE' },
          employmentType: 'FULL_TIME',
          salary: { minimum: 10, maximum: 20, currency: 'INR' },
          skills: ['Playwright'],
          publishedAt: '2026-07-30T00:00:00.000Z',
          applyUrl: 'https://example.com/apply',
        },
        displayScore: 90,
        scoreResult: scoreResult(0.9),
        category: 'BEST_MATCH',
        matchType: 'EXACT',
        createdAt: '2026-07-30T00:00:00.000Z',
      },
      {
        id: 'rec-career-2',
        runId: 'run-career-1',
        rank: 2,
        job: {
          id: 'career-job-2',
          title: 'QA Analyst',
          company: { slug: 'beta', name: 'Beta', logoUrl: null, verified: true },
          location: { formatted: 'Hybrid', remoteType: 'HYBRID' },
          employmentType: 'FULL_TIME',
          salary: { minimum: 10, maximum: 20, currency: 'INR' },
          skills: ['Selenium'],
          publishedAt: '2026-07-30T00:00:00.000Z',
          applyUrl: 'https://example.com/apply',
        },
        displayScore: 76,
        scoreResult: scoreResult(0.76),
        category: 'GOOD_MATCH',
        matchType: 'RELATED',
        createdAt: '2026-07-30T00:00:00.000Z',
      },
    ]);

    renderPage(true, '/for-you?mode=career');

    const textarea = await screen.findByLabelText(/career goal/i);
    await user.type(textarea, 'Move from manual testing into automation QA');
    await user.click(screen.getByRole('button', { name: /generate career matches/i }));

    expect(await screen.findByText(/automation qa engineer/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /target-role matches/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /transitional matches/i })).toBeInTheDocument();
    expect(createCareerTargetMock).toHaveBeenCalledWith(
      'Move from manual testing into automation QA',
    );
    expect(generateCareerGoalMock).toHaveBeenCalledWith('target-1');
    expect(listMock).not.toHaveBeenCalled();
  });

  it('creates, reruns, and deletes saved searches from the Saved tab', async () => {
    const user = userEvent.setup();
    listSavedSearchesMock.mockResolvedValue({
      items: [
        {
          id: 'search-1',
          name: 'Remote TypeScript',
          query: 'Remote TypeScript platform engineer',
          filters: {},
          context: {},
          createdAt: '2026-08-02T00:00:00.000Z',
          updatedAt: '2026-08-02T00:00:00.000Z',
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
    });
    createSavedSearchMock.mockResolvedValue({
      id: 'search-2',
      name: 'Backend',
      query: 'Backend engineer',
      filters: {},
      context: {},
      createdAt: '2026-08-02T00:00:00.000Z',
      updatedAt: '2026-08-02T00:00:00.000Z',
    });
    generateSavedSearchMock.mockResolvedValue([
      {
        id: 'rec-saved-1',
        runId: 'run-saved-1',
        rank: 1,
        job: {
          id: 'saved-job-1',
          title: 'Saved Search Backend Engineer',
          company: { slug: 'theta', name: 'Theta', logoUrl: null, verified: true },
          location: { formatted: 'Remote', remoteType: 'REMOTE' },
          employmentType: 'FULL_TIME',
          salary: { minimum: 10, maximum: 20, currency: 'INR' },
          skills: ['TypeScript'],
          publishedAt: '2026-07-30T00:00:00.000Z',
          applyUrl: 'https://example.com/apply',
        },
        displayScore: 84,
        scoreResult: scoreResult(0.84),
        category: 'GOOD_MATCH',
        matchType: 'RELATED',
        createdAt: '2026-07-30T00:00:00.000Z',
      },
    ]);
    deleteSavedSearchMock.mockResolvedValue(undefined);

    renderPage(true, '/for-you?mode=saved');

    expect(await screen.findByText(/remote typescript platform engineer/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/saved search name/i), 'Backend');
    await user.type(screen.getByLabelText(/search query/i), 'Backend engineer');
    await user.click(screen.getByRole('button', { name: /create saved search/i }));
    await waitFor(() => expect(createSavedSearchMock).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: /rerun saved search/i }));
    expect(await screen.findByText(/saved search backend engineer/i)).toBeInTheDocument();
    expect(generateSavedSearchMock).toHaveBeenCalledWith('search-2');

    await user.click(screen.getByRole('button', { name: /delete saved search/i }));
    await waitFor(() => expect(deleteSavedSearchMock).toHaveBeenCalledWith('search-2'));
    expect(await screen.findByText(/saved search deleted/i)).toBeInTheDocument();
    expect(listMock).not.toHaveBeenCalled();
  });

  it('blocks text generation when target text exceeds the API limit', async () => {
    renderPage(true, '/for-you?mode=text-career');

    fireEvent.change(await screen.findByLabelText(/target role text/i), {
      target: { value: 'x'.repeat(20_001) },
    });

    expect(screen.getByText(/20,000 characters or fewer/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate from text/i })).toBeDisabled();
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it('generates resume recommendations from a completed resume source', async () => {
    const user = userEvent.setup();
    profileMock.mockResolvedValue({
      isComplete: true,
      sourceResumeId: 'resume-1',
      userId: 'user-1',
      personalDetails: {},
      skills: [],
      experience: [],
      education: [],
      certifications: [],
    });
    generateResumeMock.mockResolvedValue([
      {
        id: 'rec-resume-1',
        runId: 'run-resume-1',
        rank: 1,
        job: {
          id: 'resume-job',
          title: 'Resume Matched Engineer',
          company: { slug: 'gamma', name: 'Gamma', logoUrl: null, verified: true },
          location: { formatted: 'Remote', remoteType: 'REMOTE' },
          employmentType: 'FULL_TIME',
          salary: { minimum: 10, maximum: 20, currency: 'INR' },
          skills: ['TypeScript'],
          publishedAt: '2026-07-30T00:00:00.000Z',
          applyUrl: 'https://example.com/apply',
        },
        displayScore: 82,
        scoreResult: scoreResult(0.82),
        category: 'BEST_MATCH',
        matchType: 'EXACT',
        createdAt: '2026-07-30T00:00:00.000Z',
      },
    ]);

    renderPage(true, '/for-you?mode=resume');

    expect(await screen.findByText(/confirmed resume/i)).toBeInTheDocument();
    const generateButton = screen.getByRole('button', { name: /generate from resume/i });
    await waitFor(() => expect(generateButton).toBeEnabled());
    await user.click(generateButton);

    expect(await screen.findByText(/resume matched engineer/i)).toBeInTheDocument();
    expect(screen.getByText(/82% Match/i)).toBeInTheDocument();
    expect(generateResumeMock).toHaveBeenCalledWith('resume-1');
    expect(listMock).not.toHaveBeenCalled();
  });

  it('shows a resume CTA when no completed resume source is available', async () => {
    profileMock.mockResolvedValue(null);

    renderPage(true, '/for-you?mode=resume');

    expect(await screen.findByRole('status')).toHaveTextContent(/upload and confirm/i);
    expect(screen.getByRole('link', { name: /add resume/i })).toHaveAttribute('href', '/profile');
    expect(generateResumeMock).not.toHaveBeenCalled();
  });

  it('renders similar jobs from the Similar tab without showing the source job', async () => {
    similarMock.mockResolvedValue([
      {
        rank: 1,
        job: {
          id: 'source-job',
          title: 'Source duplicate',
          company: { slug: 'acme', name: 'Acme', logoUrl: null, verified: true },
          location: { formatted: 'Remote', remoteType: 'REMOTE' },
          employmentType: 'FULL_TIME',
          salary: { minimum: null, maximum: null, currency: null },
          skills: ['React'],
          publishedAt: '2026-07-30T00:00:00.000Z',
          applyUrl: 'https://example.com/source',
        },
        displayScore: 99,
        scoreResult: scoreResult(0.99),
        category: 'BEST_MATCH',
        matchType: 'EXACT',
      },
      {
        rank: 2,
        job: {
          id: 'similar-job',
          title: 'Design Systems Engineer',
          company: { slug: 'beta', name: 'Beta', logoUrl: null, verified: true },
          location: { formatted: 'Hybrid', remoteType: 'HYBRID' },
          employmentType: 'FULL_TIME',
          salary: { minimum: 10, maximum: 20, currency: 'INR' },
          skills: ['React'],
          publishedAt: '2026-07-30T00:00:00.000Z',
          applyUrl: 'https://example.com/apply',
        },
        displayScore: 91,
        scoreResult: scoreResult(0.91),
        category: 'STRONG_MATCH',
        matchType: 'RELATED',
      },
    ]);

    renderPage(true, '/for-you?mode=similar&jobId=source-job');

    expect(await screen.findByText(/design systems engineer/i)).toBeInTheDocument();
    expect(screen.getByText(/91% Match/i)).toBeInTheDocument();
    expect(screen.queryByText(/source duplicate/i)).not.toBeInTheDocument();
    expect(listMock).not.toHaveBeenCalled();
    expect(similarMock).toHaveBeenCalledWith('source-job', { limit: 20 }, expect.anything());
  });

  it('shows profile CTA when incomplete and list empty', async () => {
    listMock.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });
    renderPage(false);

    expect(await screen.findByRole('status')).toHaveTextContent(/complete your profile/i);
    expect(screen.getByRole('link', { name: /complete profile/i })).toHaveAttribute(
      'href',
      '/profile',
    );
    expect(screen.queryByRole('button', { name: /generate recommendations/i })).not.toBeInTheDocument();
  });

  it('shows generate CTA when profile complete and list empty without calling generate on load', async () => {
    listMock.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });
    readinessMock.mockReturnValue({
      data: {
        canGenerateFromProfile: true,
        blockers: [],
        stale: false,
        ready: false,
        lifecycleState: 'NOT_STARTED',
        retrieval: { configured: true, backend: 'PGVECTOR' },
      },
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    renderPage(true);

    expect(await screen.findByRole('button', { name: /generate recommendations/i })).toBeInTheDocument();
    expect(listMock).toHaveBeenCalledWith(
      { page: 1, limit: 20, latestOnly: true },
      expect.anything(),
    );
    expect(generateMock).not.toHaveBeenCalled();
  });

  it('shows stale lifecycle banner with refresh CTA', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({
      items: [
        {
          id: 'r-stale',
          runId: 'run-stale',
          rank: 1,
          job: {
            id: 'job-stale',
            title: 'Stale Match Engineer',
            company: { slug: 'acme', name: 'Acme', logoUrl: null, verified: true },
            location: { formatted: 'Remote', remoteType: 'REMOTE' },
            employmentType: 'FULL_TIME',
            salary: { minimum: 10, maximum: 20, currency: 'INR' },
            skills: ['React'],
            publishedAt: '2026-07-30T00:00:00.000Z',
            applyUrl: 'https://example.com/apply',
          },
          displayScore: 88,
          scoreResult: scoreResult(0.88),
          category: 'BEST_MATCH',
          matchType: 'EXACT',
          createdAt: '2026-07-30T00:00:00.000Z',
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
    });
    readinessMock.mockReturnValue({
      data: {
        canGenerateFromProfile: true,
        blockers: ['RECOMMENDATIONS_STALE'],
        stale: true,
        ready: true,
        lifecycleState: 'STALE',
        retrieval: { configured: true, backend: 'PGVECTOR' },
      },
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderPage(true);

    expect(await screen.findByText(/profile changed since these matches were generated/i)).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /refresh matches/i })[0]);
    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));
    expect(generateMock).not.toHaveBeenCalled();
  });

  it('shows processing lifecycle with status refresh', async () => {
    const refetchReadiness = vi.fn();
    listMock.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });
    readinessMock.mockReturnValue({
      data: {
        canGenerateFromProfile: true,
        blockers: [],
        stale: false,
        ready: false,
        lifecycleState: 'PROCESSING',
        retrieval: { configured: true, backend: 'PGVECTOR' },
      },
      isError: false,
      isFetching: false,
      refetch: refetchReadiness,
    });

    renderPage(true);

    expect(await screen.findByText(/recommendation run is processing/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /generate recommendations/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /refresh status/i }));
    expect(refetchReadiness).toHaveBeenCalledTimes(1);
  });

  it('shows failed lifecycle code with retry CTA', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });
    readinessMock.mockReturnValue({
      data: {
        canGenerateFromProfile: true,
        blockers: [],
        stale: false,
        ready: false,
        lifecycleState: 'FAILED_PROVIDER',
        retrieval: { configured: true, backend: 'PGVECTOR' },
      },
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderPage(true);

    expect(await screen.findByText(/Code: FAILED_PROVIDER/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /retry recommendations/i }));
    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));
    expect(generateMock).not.toHaveBeenCalled();
  });

  it('renders match percent from displayScore without double scaling', async () => {
    listMock.mockResolvedValue({
      items: [
        {
          id: 'r1',
          runId: 'run-1',
          rank: 1,
          job: {
            id: 'job-1',
            title: 'Frontend Engineer',
            company: { slug: 'acme', name: 'Acme', logoUrl: null, verified: true },
            location: { formatted: 'Remote', remoteType: 'REMOTE' },
            employmentType: 'FULL_TIME',
            salary: { minimum: 10, maximum: 20, currency: 'INR' },
            skills: ['React'],
            publishedAt: '2026-07-30T00:00:00.000Z',
            applyUrl: 'https://example.com/apply',
          },
          displayScore: 88,
          scoreResult: scoreResult(0.12),
          category: 'BEST_MATCH',
          matchType: 'EXACT',
          createdAt: '2026-07-30T00:00:00.000Z',
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
    });

    renderPage(true);
    expect(await screen.findByText(/88% Match/i)).toBeInTheDocument();
    expect(screen.getByText(/ai recommended/i)).toBeInTheDocument();
  });

  it('silently sends recommendation feedback for viewed, opened, saved, and applied cards', async () => {
    const user = userEvent.setup();
    const openApply = vi.spyOn(window, 'open').mockReturnValue({ opener: null } as Window);
    listMock.mockResolvedValue({
      items: [
        {
          id: 'r-track',
          runId: 'run-track',
          rank: 1,
          job: {
            id: 'job-track',
            title: 'Tracked Frontend Engineer',
            company: { slug: 'acme', name: 'Acme', logoUrl: null, verified: true },
            location: { formatted: 'Remote', remoteType: 'REMOTE' },
            employmentType: 'FULL_TIME',
            salary: { minimum: 10, maximum: 20, currency: 'INR' },
            skills: ['React'],
            publishedAt: '2026-07-30T00:00:00.000Z',
            applyUrl: 'https://example.com/apply',
          },
          displayScore: 88,
          scoreResult: scoreResult(0.88),
          category: 'BEST_MATCH',
          matchType: 'EXACT',
          createdAt: '2026-07-30T00:00:00.000Z',
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
    });

    renderPage(true);

    expect(await screen.findByText(/tracked frontend engineer/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(feedbackMock).toHaveBeenCalledWith('r-track', 'VIEWED'),
    );
    await user.click(
      screen.getByRole('button', { name: /open tracked frontend engineer at acme/i }),
    );
    await waitFor(() =>
      expect(feedbackMock).toHaveBeenCalledWith('r-track', 'OPENED'),
    );
    await user.click(screen.getByRole('button', { name: /save tracked frontend engineer/i }));
    await waitFor(() => expect(saveJobMock).toHaveBeenCalledWith('job-track'));
    await waitFor(() => expect(feedbackMock).toHaveBeenCalledWith('r-track', 'SAVED'));

    await user.click(screen.getByRole('button', { name: /apply to tracked frontend engineer/i }));
    expect(openApply).toHaveBeenCalledWith(
      'https://example.com/apply',
      '_blank',
      'noopener,noreferrer',
    );
    await waitFor(() => expect(feedbackMock).toHaveBeenCalledWith('r-track', 'APPLIED'));

    await user.click(
      screen.getByRole('button', { name: /show more jobs like tracked frontend engineer/i }),
    );
    await waitFor(() =>
      expect(feedbackMock).toHaveBeenCalledWith('r-track', 'MORE_LIKE_THIS'),
    );
    expect(await screen.findByText(/future matches will lean toward jobs like this/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /more jobs like tracked frontend engineer selected/i }),
    ).toBeDisabled();

    await user.click(
      screen.getByRole('button', { name: /show fewer jobs like tracked frontend engineer/i }),
    );
    await waitFor(() =>
      expect(feedbackMock).toHaveBeenCalledWith('r-track', 'LESS_LIKE_THIS'),
    );
    expect(await screen.findByText(/future matches will avoid jobs like this/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText(/tracked frontend engineer/i)).not.toBeInTheDocument(),
    );
    openApply.mockRestore();
  });

  it('generates only on explicit click', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });
    generateMock.mockResolvedValue([]);
    renderPage(true);

    await user.click(await screen.findByRole('button', { name: /generate recommendations/i }));
    await waitFor(() => expect(generateMock).toHaveBeenCalledTimes(1));
  });
});
