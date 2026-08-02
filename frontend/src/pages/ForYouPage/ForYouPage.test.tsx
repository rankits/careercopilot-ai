import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as RecommendationHooks from '@/features/recommendations/hooks/useRecommendations';

import { authReducer } from '@/features/auth/authSlice';

import { ForYouPage } from './ForYouPage';

const { listMock, generateMock, listSavedMock, readinessMock, feedbackMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
  generateMock: vi.fn(),
  listSavedMock: vi.fn(),
  readinessMock: vi.fn(),
  feedbackMock: vi.fn(),
}));

vi.mock('@/features/recommendations/services/recommendations.service', () => ({
  recommendationsService: {
    list: listMock,
    generateFromProfile: generateMock,
    getReadiness: readinessMock,
    submitFeedback: feedbackMock,
  },
}));

vi.mock('@/features/recommendations/hooks/useRecommendations', async (importOriginal) => {
  const actual = await importOriginal<typeof RecommendationHooks>();
  return {
    ...actual,
    useRecommendationReadiness: () => ({
      data: {
        canGenerateFromProfile: true,
        blockers: [],
        stale: false,
        ready: true,
        retrieval: { configured: true, backend: 'PGVECTOR' },
      },
      isError: false,
    }),
  };
});

vi.mock('@/features/applications/services/applications.service', () => ({
  applicationsService: {
    listSavedJobs: listSavedMock,
    saveJob: vi.fn(),
    unsaveJob: vi.fn(),
  },
}));

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
  listSavedMock.mockReset();
  listSavedMock.mockResolvedValue([]);
});

describe('ForYouPage', () => {
  it('renders recommendation mode tabs with profile selected by default', async () => {
    listMock.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });
    renderPage(true);

    expect(await screen.findByRole('tablist', { name: /recommendation modes/i })).toBeInTheDocument();
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

  it('navigates to unwired mode placeholders without loading profile recommendations', async () => {
    const user = userEvent.setup();
    renderPage(true, '/for-you?mode=similar');

    expect(await screen.findByRole('tabpanel', { name: /similar/i })).toHaveTextContent(
      /being wired/i,
    );
    expect(listMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole('tab', { name: /^profile$/i }));
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(1));
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
    renderPage(true);

    expect(await screen.findByRole('button', { name: /generate recommendations/i })).toBeInTheDocument();
    expect(listMock).toHaveBeenCalledWith(
      { page: 1, limit: 20, latestOnly: true },
      expect.anything(),
    );
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
          scoreResult: { overallScore: 0.12, components: {}, matchedSkills: [], relatedSkills: [], missingSkills: [], reasons: [] },
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

  it('generates only on explicit click', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });
    generateMock.mockResolvedValue([]);
    renderPage(true);

    await user.click(await screen.findByRole('button', { name: /generate recommendations/i }));
    await waitFor(() => expect(generateMock).toHaveBeenCalledTimes(1));
  });
});
