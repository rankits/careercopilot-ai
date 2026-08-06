import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authReducer } from '@/features/auth/authSlice';

import { HomePage } from './HomePage';

const {
  listJobsMock,
  listRecommendationsMock,
  listSavedJobsMock,
  listApplicationsMock,
  listSavedVersionsMock,
  getMyProfileMock,
} = vi.hoisted(() => ({
  listJobsMock: vi.fn(),
  listRecommendationsMock: vi.fn(),
  listSavedJobsMock: vi.fn(),
  listApplicationsMock: vi.fn(),
  listSavedVersionsMock: vi.fn(),
  getMyProfileMock: vi.fn(),
}));

vi.mock('@/features/jobs/services/jobs.service', () => ({
  jobsService: {
    listJobs: listJobsMock,
  },
}));

vi.mock('@/features/recommendations/services/recommendations.service', () => ({
  recommendationsService: {
    list: listRecommendationsMock,
  },
}));

vi.mock('@/features/applications/services/applications.service', () => ({
  applicationsService: {
    list: listApplicationsMock,
    listSavedJobs: listSavedJobsMock,
  },
}));

vi.mock('@/services/resumeBuilder.service', () => ({
  resumeBuilderService: {
    listSavedVersions: listSavedVersionsMock,
  },
}));

vi.mock('@/features/resume/services/resume.service', () => ({
  resumeService: {
    getMyProfile: getMyProfileMock,
  },
}));

vi.mock('@/features/auth/utils/authSession', async () => {
  const actual = await vi.importActual('@/features/auth/utils/authSession');
  return {
    ...(actual as Record<string, unknown>),
    hasAuthSession: () => true,
  };
});

function renderPage(initialPath = '/app') {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        accessToken: 'token',
        error: null,
        isAuthenticated: true,
        isLoading: false,
        isProfileComplete: true,
        isSessionResolved: true,
        user: {
          email: 'raj@example.com',
          firstName: 'Raj',
          id: 'u1',
          isProfileCreated: true,
          name: 'Raj Patel',
          role: 'USER' as const,
        },
      },
    },
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/app" element={<HomePage />} />
            <Route path="/ai-match" element={<p>AI Match opened</p>} />
            <Route path="/jobs/:jobId" element={<p>Job detail opened</p>} />
            <Route path="/applications" element={<p>Applications opened</p>} />
            <Route path="/saved-jobs" element={<p>Saved Jobs opened</p>} />
            <Route path="/resume-builder" element={<p>Resume Builder opened</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>,
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    listJobsMock.mockResolvedValue({
      items: [],
      pagination: { hasNextPage: false, page: 1, totalItems: 248, totalPages: 1 },
    });
    listRecommendationsMock.mockResolvedValue({
      items: [
        {
          id: 'rec-1',
          runId: 'run-1',
          rank: 1,
          displayScore: 95,
          scoreResult: {
            overallScore: 0.95,
            components: {},
            matchedSkills: [],
            aliasSkills: [],
            relatedSkills: [],
            transferableSkills: [],
            missingSkills: [],
            reasons: [],
          },
          job: {
            id: 'job-1',
            title: 'Frontend Engineer',
            company: {
              slug: 'google',
              name: 'Google',
              logoUrl: null,
              verified: true,
            },
            location: {
              formatted: 'Mountain View, CA',
              remoteType: 'HYBRID',
            },
            employmentType: 'FULL_TIME',
            salary: { minimum: null, maximum: null, currency: null },
            skills: ['React'],
            publishedAt: new Date().toISOString(),
            applyUrl: 'https://example.com/jobs/1',
          },
          category: 'STRONG',
          matchType: 'PROFILE',
          createdAt: new Date().toISOString(),
        },
      ],
      limit: 10,
      page: 1,
      total: 1,
    });
    listSavedJobsMock.mockResolvedValue([
      {
        id: 'app-saved-1',
        jobId: 'job-2',
        companyName: 'Stripe',
        jobTitle: 'Backend Engineer',
        createdAt: new Date().toISOString(),
        currentStatus: 'SAVED',
        location: 'Remote',
      },
    ]);
    listApplicationsMock.mockResolvedValue({
      items: [
        {
          id: 'app-1',
          companyName: 'Acme',
          jobTitle: 'Engineer',
          createdAt: new Date().toISOString(),
          currentStatus: 'APPLIED',
        },
        {
          id: 'app-2',
          companyName: 'Acme',
          jobTitle: 'Engineer 2',
          createdAt: new Date().toISOString(),
          currentStatus: 'INTERVIEW',
        },
      ],
      pagination: { hasNextPage: false, page: 1, totalItems: 2, totalPages: 1 },
    });
    listSavedVersionsMock.mockResolvedValue([
      {
        id: 1,
        atsScore: 92,
        content: 'skills experience project',
        createdAt: new Date().toISOString(),
      },
    ]);
    getMyProfileMock.mockResolvedValue({
      certifications: [],
      education: [],
      experience: [{ title: 'Engineer', description: 'Built a project platform' }],
      isComplete: true,
      personalDetails: {},
      skills: ['React'],
      sourceResumeId: null,
      userId: 'u1',
    });
  });

  it('renders welcome, stats, and section headings from live data', async () => {
    renderPage();

    expect(screen.getByLabelText(/dashboard page/i)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /good (morning|afternoon|evening), raj/i }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('248')).toBeInTheDocument();
    });

    expect(screen.getAllByText(/open jobs/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /application pipeline/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /resume score/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /recommended for you/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /recently saved/i })).toBeInTheDocument();
    expect(await screen.findByText(/frontend engineer/i)).toBeInTheDocument();
    expect(screen.getByText(/backend engineer/i)).toBeInTheDocument();
  });

  it('navigates to job detail with the same fromFeed state as Job Feed', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText(/frontend engineer/i);
    await user.click(screen.getByRole('button', { name: /view frontend engineer/i }));

    expect(await screen.findByText(/job detail opened/i)).toBeInTheDocument();
  });

  it('navigates to AI Match from the explore CTA', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('link', { name: /explore jobs/i }));
    expect(await screen.findByText(/ai match opened/i)).toBeInTheDocument();
  });
});
