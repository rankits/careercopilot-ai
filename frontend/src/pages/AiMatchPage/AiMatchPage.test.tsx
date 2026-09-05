import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/organisms/Toast/ToastProvider';

import type * as RecommendationHooks from '@/features/recommendations/hooks/useRecommendations';

import { authReducer } from '@/features/auth/authSlice';

import { AiMatchPage } from './AiMatchPage';

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
  listSimilarSourceCandidatesMock,
  saveJobMock,
  unsaveJobMock,
  profileMock,
  listResumesMock,
  readinessMock,
  feedbackMock,
  similarMock,
  getJobMock,
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
  listSimilarSourceCandidatesMock: vi.fn(),
  saveJobMock: vi.fn(),
  unsaveJobMock: vi.fn(),
  profileMock: vi.fn(),
  listResumesMock: vi.fn(),
  readinessMock: vi.fn(),
  feedbackMock: vi.fn(),
  similarMock: vi.fn(),
  getJobMock: vi.fn(),
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
    listSimilarSourceCandidates: listSimilarSourceCandidatesMock,
    saveJob: saveJobMock,
    unsaveJob: unsaveJobMock,
  },
}));

vi.mock('@/features/resume/services/resume.service', () => ({
  resumeService: {
    getMyProfile: profileMock,
    listResumes: listResumesMock,
  },
}));

vi.mock('@/features/jobs/services/jobs.service', () => ({
  jobsService: {
    getJob: getJobMock,
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

function renderPage(isProfileComplete = true, route = '/ai-match') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          id: 'u1',
          email: 'a@b.com',
          name: 'A',
          role: 'USER' as const,
          isProfileCreated: true,
        },
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
        <ToastProvider>
          <MemoryRouter initialEntries={[route]}>
            <AiMatchPage />
          </MemoryRouter>
        </ToastProvider>
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
  profileMock.mockResolvedValue(null);
  listResumesMock.mockReset();
  listResumesMock.mockResolvedValue([]);
  getJobMock.mockReset();
  getJobMock.mockResolvedValue({
    id: 'source-job',
    title: 'Source duplicate',
    company: { slug: 'acme', name: 'Acme', logoUrl: null, verified: true },
    location: { formatted: 'Remote', remoteType: 'REMOTE' },
    employmentType: 'FULL_TIME',
    salary: { minimum: null, maximum: null, currency: null },
    skills: [],
    publishedAt: '2026-07-30T00:00:00.000Z',
    applyUrl: 'https://example.com/source',
    descriptionHtml: '',
    descriptionText: '',
    benefits: [],
    tags: [],
    companyIndustry: null,
    companySize: null,
  });
  readinessMock.mockReset();
  listSavedMock.mockReset();
  listSavedMock.mockResolvedValue([]);
  listSimilarSourceCandidatesMock.mockReset();
  listSimilarSourceCandidatesMock.mockResolvedValue([]);
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

describe('AiMatchPage', () => {
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
    expect(screen.getByRole('tab', { name: /resume/i })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tabpanel', { name: /profile/i })).toBeInTheDocument();
  });

  it('moves recommendation tabs with arrow keys', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });
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

  it('opens the Saved tab showing the All Saved Jobs view without loading profile recommendations', async () => {
    const user = userEvent.setup();
    renderPage(true, '/ai-match?mode=saved');

    expect(await screen.findByText(/no saved jobs yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /all saved jobs/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new saved search/i })).toBeInTheDocument();
    expect(listMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole('tab', { name: /^profile$/i }));
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(1));
  });

  it('generates text recommendations from pasted text', async () => {
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

    renderPage(true, '/ai-match?mode=text-career');

    expect(await screen.findByText(/no recommendations yet/i)).toBeInTheDocument();

    const textarea = await screen.findByLabelText(/describe your ideal job/i);
    await user.type(textarea, 'Remote Node.js backend role');
    await user.click(screen.getByRole('button', { name: /generate matches/i }));

    expect(await screen.findByText(/text matched backend engineer/i)).toBeInTheDocument();
    expect(screen.getByText(/86% Match/i)).toBeInTheDocument();
    expect(generateTextMock).toHaveBeenCalledWith('Remote Node.js backend role');
    expect(listMock).not.toHaveBeenCalled();
  });

  it('blocks text generation when target text exceeds the 500-character limit', async () => {
    renderPage(true, '/ai-match?mode=text-career');

    fireEvent.change(await screen.findByLabelText(/describe your ideal job/i), {
      target: { value: 'x'.repeat(501) },
    });

    expect(screen.getByText(/500 characters or fewer/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate matches/i })).toBeDisabled();
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it('clears the text field with the Clear button', async () => {
    const user = userEvent.setup();
    renderPage(true, '/ai-match?mode=text-career');

    const textarea = await screen.findByLabelText(/describe your ideal job/i);
    await user.type(textarea, 'Some target text');
    expect(textarea).toHaveValue('Some target text');

    await user.click(screen.getByRole('button', { name: /^clear$/i }));
    expect(textarea).toHaveValue('');
  });

  it('generates career recommendations from structured fields and groups results by category', async () => {
    const user = userEvent.setup();
    createCareerTargetMock.mockResolvedValue({
      id: 'target-1',
      goalText: 'Target role: Automation QA Engineer.',
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

    renderPage(true, '/ai-match?mode=career');

    const targetRoleInput = await screen.findByLabelText(/target role/i);
    await user.type(targetRoleInput, 'Automation QA Engineer');
    await user.click(screen.getByRole('button', { name: /generate matches/i }));

    expect(await screen.findByText(/automation qa engineer/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /target-role matches/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /transitional matches/i })).toBeInTheDocument();
    expect(createCareerTargetMock).toHaveBeenCalledWith({
      goalText: 'Target role: Automation QA Engineer.',
      structured: {
        targetRole: 'Automation QA Engineer',
        careerLevel: 'Any experience level',
        locationScope: 'ANY',
        locations: [],
        summary: '',
        flexibilityMode: 'FLEXIBLE',
      },
    });
    expect(generateCareerGoalMock).toHaveBeenCalledWith('target-1');
    expect(listMock).not.toHaveBeenCalled();
  });

  it('includes the selected country when generating career matches', async () => {
    const user = userEvent.setup();
    createCareerTargetMock.mockResolvedValue({
      id: 'target-1',
      goalText: 'Target role: Software developer. Preferred country: India.',
      structured: {},
      createdAt: '2026-08-02T00:00:00.000Z',
      updatedAt: '2026-08-02T00:00:00.000Z',
    });
    generateCareerGoalMock.mockResolvedValue([]);

    renderPage(true, '/ai-match?mode=career');

    await user.type(await screen.findByLabelText(/target role/i), 'Software developer');
    const countryInput = screen.getByLabelText(/^country$/i);
    await user.click(countryInput);
    await user.clear(countryInput);
    await user.type(countryInput, 'India');
    await user.click(await screen.findByRole('option', { name: 'India' }));
    await user.click(screen.getByRole('button', { name: /generate matches/i }));

    expect(createCareerTargetMock).toHaveBeenCalledWith({
      goalText: 'Target role: Software developer. Preferred country: India.',
      structured: {
        targetRole: 'Software developer',
        careerLevel: 'Any experience level',
        locationScope: 'GEOGRAPHIC',
        locations: ['India'],
        summary: '',
        flexibilityMode: 'FLEXIBLE',
      },
    });
  });

  it('includes the selected work mode when generating career matches', async () => {
    const user = userEvent.setup();
    createCareerTargetMock.mockResolvedValue({
      id: 'target-1',
      goalText: 'Target role: Software developer. Work mode: Remote.',
      structured: {},
      createdAt: '2026-08-02T00:00:00.000Z',
      updatedAt: '2026-08-02T00:00:00.000Z',
    });
    generateCareerGoalMock.mockResolvedValue([]);

    renderPage(true, '/ai-match?mode=career');

    await user.type(await screen.findByLabelText(/target role/i), 'Software developer');
    await user.click(screen.getByLabelText(/work mode/i));
    await user.click(await screen.findByRole('option', { name: 'Remote' }));
    await user.click(screen.getByRole('button', { name: /generate matches/i }));

    expect(createCareerTargetMock).toHaveBeenCalledWith({
      goalText: 'Target role: Software developer. Work mode: Remote.',
      structured: {
        targetRole: 'Software developer',
        careerLevel: 'Any experience level',
        locationScope: 'WORK_MODE',
        locations: [],
        remotePreference: 'REMOTE',
        summary: '',
        flexibilityMode: 'FLEXIBLE',
      },
    });
  });

  it('fills the career path field when a popular path is clicked', async () => {
    const user = userEvent.setup();
    profileMock.mockResolvedValue({
      certifications: [],
      education: [],
      experience: [],
      isComplete: true,
      personalDetails: { designation: 'Software Engineer' },
      skills: ['React', 'TypeScript'],
      sourceResumeId: null,
      userId: 'u1',
    });
    renderPage(true, '/ai-match?mode=career');

    await screen.findByText(/quick picks/i);
    const quickPick = await screen.findByRole('button', {
      name: /software engineer.*senior software engineer/i,
    });
    await user.click(quickPick);

    expect(screen.getByLabelText(/career path/i)).toHaveValue(
      'Software Engineer → Senior Software Engineer',
    );
    expect(quickPick).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^clear$/i })).toBeInTheDocument();
  });

  it('shows non-technical quick picks for non-technical profiles', async () => {
    profileMock.mockResolvedValue({
      certifications: [],
      education: [],
      experience: [],
      isComplete: true,
      personalDetails: { designation: 'Marketing Coordinator' },
      skills: ['SEO', 'content strategy'],
      sourceResumeId: null,
      userId: 'u1',
    });
    renderPage(true, '/ai-match?mode=career');

    expect(
      await screen.findByRole('button', { name: /marketing coordinator.*marketing manager/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('button', {
        name: /marketing coordinator.*digital marketing specialist/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /software engineer.*senior software engineer/i }),
    ).not.toBeInTheDocument();
  });

  it('clears a selected career quick pick when clicked again or via Clear', async () => {
    const user = userEvent.setup();
    profileMock.mockResolvedValue({
      certifications: [],
      education: [],
      experience: [],
      isComplete: true,
      personalDetails: { designation: 'Software Engineer' },
      skills: ['React', 'TypeScript'],
      sourceResumeId: null,
      userId: 'u1',
    });
    renderPage(true, '/ai-match?mode=career');

    await screen.findByText(/quick picks/i);
    const quickPick = await screen.findByRole('button', {
      name: /software engineer.*senior software engineer/i,
    });
    await user.click(quickPick);
    await user.click(quickPick);

    expect(screen.getByLabelText(/career path/i)).toHaveValue('');
    expect(quickPick).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: /^clear$/i })).not.toBeInTheDocument();

    await user.click(quickPick);
    await user.click(screen.getByRole('button', { name: /^clear$/i }));

    expect(screen.getByLabelText(/career path/i)).toHaveValue('');
    expect(quickPick).toHaveAttribute('aria-pressed', 'false');
  });

  it('creates, reruns, and deletes a saved search from the Saved tab', async () => {
    const user = userEvent.setup();
    const search1 = {
      id: 'search-1',
      name: 'Remote TypeScript',
      query: 'Remote TypeScript platform engineer',
      filters: {},
      context: {},
      createdAt: '2026-08-02T00:00:00.000Z',
      updatedAt: '2026-08-02T00:00:00.000Z',
    };
    const search2 = {
      id: 'search-2',
      name: 'Backend',
      query: 'Backend engineer',
      filters: {},
      context: {},
      createdAt: '2026-08-02T00:00:00.000Z',
      updatedAt: '2026-08-02T00:00:00.000Z',
    };
    let savedSearchListCalls = 0;
    listSavedSearchesMock.mockImplementation(() => {
      savedSearchListCalls += 1;
      const items = savedSearchListCalls === 1 ? [search1] : [search1, search2];
      return Promise.resolve({ items, page: 1, limit: 20, total: items.length });
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

    renderPage(true, '/ai-match?mode=saved');

    expect(await screen.findByRole('button', { name: /remote typescript/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /new saved search/i }));
    await user.type(screen.getByLabelText(/saved search name/i), 'Backend');
    await user.type(screen.getByLabelText(/search query/i), 'Backend engineer');
    await user.click(screen.getByRole('button', { name: /create saved search/i }));
    await waitFor(() => expect(createSavedSearchMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('alert')).toHaveTextContent(/saved search created/i);

    await user.click(screen.getByRole('button', { name: /rerun saved search/i }));
    expect(await screen.findByText(/saved search backend engineer/i)).toBeInTheDocument();
    expect(generateSavedSearchMock).toHaveBeenCalledWith('search-2');

    await user.click(screen.getByRole('button', { name: /delete saved search/i }));
    await waitFor(() => expect(deleteSavedSearchMock).toHaveBeenCalledWith('search-2'));
    expect(await screen.findByRole('alert')).toHaveTextContent(/saved search deleted/i);
    expect(listMock).not.toHaveBeenCalled();
  });

  it('lists saved bookmarks under All Saved Jobs without recommendation feedback actions', async () => {
    listSavedMock.mockResolvedValue([
      {
        id: 'app-1',
        jobId: 'job-bookmarked',
        jobTitle: 'Bookmarked Platform Engineer',
        companyName: 'Zeta',
        companyLogoUrl: null,
        location: 'Remote',
        remoteType: 'REMOTE',
        employmentType: 'FULL_TIME',
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: null,
        originalJobUrl: 'https://example.com/apply',
        currentStatus: 'SAVED',
        appliedAt: null,
        createdAt: '2026-07-28T00:00:00.000Z',
      },
    ]);

    renderPage(true, '/ai-match?mode=saved');

    expect(await screen.findByText(/bookmarked platform engineer/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /more actions for bookmarked platform engineer/i }),
    ).not.toBeInTheDocument();
    expect(listMock).not.toHaveBeenCalled();
  });

  it('generates resume recommendations from the confirmed resume source', async () => {
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
    listResumesMock.mockResolvedValue([
      {
        id: 'resume-1',
        mimeType: 'application/pdf',
        originalName: 'MyResume.pdf',
        processedAt: '2026-07-01T00:00:00.000Z',
        sizeBytes: 204_800,
        status: 'PROCESSED',
        uploadedAt: '2026-07-01T00:00:00.000Z',
        version: 1,
      },
    ]);
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

    renderPage(true, '/ai-match?mode=resume');

    expect(await screen.findByText(/myresume\.pdf/i)).toBeInTheDocument();
    expect(screen.getByText(/200 KB/i)).toBeInTheDocument();

    const generateButtons = screen.getAllByRole('button', { name: /generate matches/i });
    await user.click(generateButtons[0]!);

    expect(await screen.findByText(/resume matched engineer/i)).toBeInTheDocument();
    expect(screen.getByText(/82% Match/i)).toBeInTheDocument();
    expect(generateResumeMock).toHaveBeenCalledWith('resume-1');
    expect(listMock).not.toHaveBeenCalled();
  });

  it('shows a resume CTA when no completed resume source is available', async () => {
    profileMock.mockResolvedValue(null);

    renderPage(true, '/ai-match?mode=resume');

    expect(await screen.findByRole('status', { name: /upload and confirm/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /add resume/i })).toHaveAttribute('href', '/profile');
    expect(generateResumeMock).not.toHaveBeenCalled();
  });

  it('renders similar jobs and the source job card, and clears the source job', async () => {
    const user = userEvent.setup();
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

    renderPage(true, '/ai-match?mode=similar&jobId=source-job');

    expect(await screen.findByText(/design systems engineer/i)).toBeInTheDocument();
    expect(screen.getByText(/91% Match/i)).toBeInTheDocument();
    const similarList = screen.getByRole('list', { name: /similar jobs/i });
    expect(within(similarList).queryByText(/source duplicate/i)).not.toBeInTheDocument();
    expect(listMock).not.toHaveBeenCalled();
    expect(similarMock).toHaveBeenCalledWith('source-job', { limit: 20 }, expect.anything());

    expect(await screen.findByText(/^source job$/i)).toBeInTheDocument();
    expect(screen.getByText(/^source duplicate$/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /change source job/i }));
    expect(await screen.findByText(/pick a source job/i)).toBeInTheDocument();
  });

  it('auto-selects the latest saved or applied job as the similar source', async () => {
    listSimilarSourceCandidatesMock.mockResolvedValue([
      {
        appliedAt: null,
        archivedAt: null,
        closedAt: null,
        companyId: null,
        companyLogoUrl: null,
        companyName: 'Acme',
        createdAt: '2026-07-01T00:00:00.000Z',
        currentStatus: 'SAVED',
        employmentType: 'FULL_TIME',
        firstResponseAt: null,
        id: 'app-saved',
        interestLevel: null,
        jobId: 'job-saved',
        jobTitle: 'Saved Platform Engineer',
        location: 'Remote',
        originalJobUrl: null,
        primarySourceType: 'PLATFORM_JOB',
        priority: 'MEDIUM',
        remoteType: 'REMOTE',
        salaryCurrency: null,
        salaryMax: null,
        salaryMin: null,
        salaryPeriod: null,
        updatedAt: '2026-07-10T00:00:00.000Z',
        userId: 'user-1',
      },
      {
        appliedAt: '2026-07-28T00:00:00.000Z',
        archivedAt: null,
        closedAt: null,
        companyId: null,
        companyLogoUrl: null,
        companyName: 'Beta',
        createdAt: '2026-07-20T00:00:00.000Z',
        currentStatus: 'APPLIED',
        employmentType: 'FULL_TIME',
        firstResponseAt: null,
        id: 'app-applied',
        interestLevel: null,
        jobId: 'job-applied',
        jobTitle: 'Applied Frontend Engineer',
        location: 'Hybrid',
        originalJobUrl: null,
        primarySourceType: 'PLATFORM_APPLY',
        priority: 'MEDIUM',
        remoteType: 'HYBRID',
        salaryCurrency: null,
        salaryMax: null,
        salaryMin: null,
        salaryPeriod: null,
        updatedAt: '2026-07-28T00:00:00.000Z',
        userId: 'user-1',
      },
    ]);
    getJobMock.mockResolvedValue({
      id: 'job-applied',
      title: 'Applied Frontend Engineer',
      company: { slug: 'beta', name: 'Beta', logoUrl: null, verified: true },
      location: { formatted: 'Hybrid', remoteType: 'HYBRID' },
      employmentType: 'FULL_TIME',
      salary: { minimum: null, maximum: null, currency: null },
      skills: [],
      publishedAt: '2026-07-30T00:00:00.000Z',
      applyUrl: 'https://example.com/applied',
      descriptionHtml: '',
      descriptionText: '',
      benefits: [],
      tags: [],
      companyIndustry: null,
      companySize: null,
    });
    similarMock.mockResolvedValue([
      {
        rank: 1,
        job: {
          id: 'job-applied',
          title: 'Applied duplicate',
          company: { slug: 'beta', name: 'Beta', logoUrl: null, verified: true },
          location: { formatted: 'Hybrid', remoteType: 'HYBRID' },
          employmentType: 'FULL_TIME',
          salary: { minimum: null, maximum: null, currency: null },
          skills: ['React'],
          publishedAt: '2026-07-30T00:00:00.000Z',
          applyUrl: 'https://example.com/applied',
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
          title: 'Similar Frontend Engineer',
          company: { slug: 'gamma', name: 'Gamma', logoUrl: null, verified: true },
          location: { formatted: 'Remote', remoteType: 'REMOTE' },
          employmentType: 'FULL_TIME',
          salary: { minimum: null, maximum: null, currency: null },
          skills: ['React'],
          publishedAt: '2026-07-30T00:00:00.000Z',
          applyUrl: 'https://example.com/similar',
        },
        displayScore: 88,
        scoreResult: scoreResult(0.88),
        category: 'STRONG_MATCH',
        matchType: 'RELATED',
      },
    ]);

    renderPage(true, '/ai-match?mode=similar');

    expect(await screen.findByText(/similar frontend engineer/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(similarMock).toHaveBeenCalledWith('job-applied', { limit: 20 }, expect.anything()),
    );
    expect(screen.getByText(/applied frontend engineer/i)).toBeInTheDocument();
  });

  it('shows an empty state without a source job on the Similar tab', async () => {
    renderPage(true, '/ai-match?mode=similar');

    expect(await screen.findByText(/pick a source job/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /browse jobs/i })).toHaveAttribute(
      'href',
      '/jobs-feed',
    );
    expect(similarMock).not.toHaveBeenCalled();
    expect(listSimilarSourceCandidatesMock).toHaveBeenCalledTimes(1);
  });

  it('shows profile CTA when incomplete and list empty', async () => {
    listMock.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });
    renderPage(false);

    expect(
      await screen.findByRole('status', { name: /complete your profile/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /complete profile/i })).toHaveAttribute(
      'href',
      '/profile',
    );
    expect(
      screen.queryByRole('button', { name: /generate recommendations/i }),
    ).not.toBeInTheDocument();
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

    expect(
      await screen.findByRole('button', { name: /generate recommendations/i }),
    ).toBeInTheDocument();
    expect(listMock).toHaveBeenCalledWith(
      { page: 1, limit: 20, latestOnly: true },
      expect.anything(),
    );
    expect(generateMock).not.toHaveBeenCalled();
  });

  it('shows the embedding warning only after an explicit generation returns no matches', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });
    generateMock.mockResolvedValue([]);
    readinessMock.mockReturnValue({
      data: {
        canGenerateFromProfile: true,
        blockers: ['EMBEDDING_COVERAGE_LOW'],
        stale: false,
        ready: false,
        lifecycleState: 'READY',
        retrieval: { configured: true, backend: 'PGVECTOR', embeddingCoverageRatio: 0.1 },
      },
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderPage(true);

    expect(
      await screen.findByRole('button', { name: /generate recommendations/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/embedding index is still warming up/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /generate recommendations/i }));

    expect(await screen.findByText(/embedding index is still warming up/i)).toBeInTheDocument();
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

    expect(
      await screen.findByText(/profile changed since these matches were generated/i),
    ).toBeInTheDocument();
    const refreshButton = screen.getAllByRole('button', { name: /refresh matches/i })[0];
    expect(refreshButton).toBeDefined();
    await user.click(refreshButton!);
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
    expect(
      screen.queryByRole('button', { name: /generate recommendations/i }),
    ).not.toBeInTheDocument();
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
    expect(screen.getByText(/how match % works/i)).toBeInTheDocument();
    expect(screen.getByText(/fits your profile/i)).toBeInTheDocument();
  });

  it('sends recommendation feedback only after an explicit user action', async () => {
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
    expect(feedbackMock).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole('button', { name: /open tracked frontend engineer at acme/i }),
    );
    await waitFor(() => expect(feedbackMock).toHaveBeenCalledWith('r-track', 'OPENED'));
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
      screen.getByRole('button', { name: /more actions for tracked frontend engineer/i }),
    );
    await user.click(
      screen.getByRole('menuitem', { name: /show more jobs like tracked frontend engineer/i }),
    );
    await waitFor(() => expect(feedbackMock).toHaveBeenCalledWith('r-track', 'MORE_LIKE_THIS'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /future matches will lean toward jobs like this/i,
    );

    await user.click(
      screen.getByRole('button', { name: /more actions for tracked frontend engineer/i }),
    );
    expect(
      screen.getByRole('menuitem', { name: /more jobs like tracked frontend engineer selected/i }),
    ).toHaveAttribute('aria-disabled', 'true');
    await user.click(
      screen.getByRole('menuitem', { name: /show fewer jobs like tracked frontend engineer/i }),
    );
    await waitFor(() => expect(feedbackMock).toHaveBeenCalledWith('r-track', 'LESS_LIKE_THIS'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /future matches will avoid jobs like this/i,
    );
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

  it('shows a toast when profile generation returns no matching jobs', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });
    generateMock.mockResolvedValue([]);
    renderPage(true);

    await user.click(await screen.findByRole('button', { name: /generate recommendations/i }));

    expect(await screen.findByText(/no matching jobs found for your profile/i)).toBeInTheDocument();
  });
});
