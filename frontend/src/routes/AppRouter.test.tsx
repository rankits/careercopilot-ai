import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authReducer } from '@/features/auth/authSlice';
import type { AuthState, User } from '@/features/auth/types/auth.types';

import { AppRouter } from './AppRouter';

vi.mock('@/features/auth/services/auth.service', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
  },
}));

vi.mock('@/features/resume/services/resume.service', () => ({
  resumeService: {
    confirmProfile: vi.fn(),
    getProfileStatus: vi.fn(),
    parse: vi.fn(),
  },
}));

vi.mock('@/services/resumeBuilder.service', () => ({
  resumeBuilderService: {
    listResumes: vi.fn().mockResolvedValue([]),
    listSavedVersions: vi.fn().mockResolvedValue([]),
    getAnalysis: vi.fn().mockResolvedValue(null),
    getVersions: vi.fn().mockResolvedValue([]),
    getKeywords: vi.fn().mockResolvedValue({ matched: [], missing: [], partial: [] }),
    getSuggestions: vi.fn().mockResolvedValue([]),
    uploadResume: vi.fn(),
    startAnalysis: vi.fn(),
    updateStep: vi.fn(),
    updateContent: vi.fn(),
    applySuggestion: vi.fn(),
    ignoreSuggestion: vi.fn(),
    recheckAts: vi.fn(),
    saveVersion: vi.fn(),
    exportResume: vi.fn(),
    getSavedVersion: vi.fn(),
  },
}));

const user: User = {
  email: 'ada@example.com',
  id: 'user-1',
  name: 'Ada',
  role: 'user',
};

function createStore(preloaded?: Partial<AuthState>) {
  return configureStore({
    preloadedState: preloaded
      ? {
          auth: {
            accessToken: null,
            error: null,
            isAuthenticated: false,
            isLoading: false,
            isProfileComplete: false,
            isSessionResolved: true,
            user: null,
            ...preloaded,
          },
        }
      : undefined,
    reducer: { auth: authReducer },
  });
}

function renderRoute(path: string, store = createStore()) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <MemoryRouter initialEntries={[path]}>
          <AppRouter />
        </MemoryRouter>
      </Provider>
    </QueryClientProvider>,
  );
}

describe('AppRouter routing flow', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('redirects the default route to Login when unauthenticated', async () => {
    renderRoute('/');

    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });

  it('redirects unauthenticated users from protected routes to Login', async () => {
    renderRoute('/jobs-feed');

    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });

  it.each([['/resume-builder'], ['/resume-builder/saved'], ['/resume-builder/resume-1']])(
    'blocks unauthenticated access to %s and redirects to Login',
    async (path) => {
      renderRoute(path);

      expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /resume/i })).not.toBeInTheDocument();
    },
  );

  it('sends incomplete profiles from Resume Builder to onboarding', async () => {
    renderRoute(
      '/resume-builder',
      createStore({
        accessToken: 'token',
        isAuthenticated: true,
        isProfileComplete: false,
        isSessionResolved: true,
        user,
      }),
    );

    expect(
      await screen.findByRole('heading', { name: /let's build your professional profile/i }),
    ).toBeInTheDocument();
  });

  it('allows authenticated complete profiles to open Resume Builder', async () => {
    renderRoute(
      '/resume-builder',
      createStore({
        accessToken: 'token',
        isAuthenticated: true,
        isProfileComplete: true,
        isSessionResolved: true,
        user,
      }),
    );

    expect(await screen.findByRole('heading', { name: /^resume builder$/i })).toBeInTheDocument();
  });

  it('redirects authenticated users away from Login to Onboarding when profile is incomplete', async () => {
    renderRoute(
      '/login',
      createStore({
        accessToken: 'token',
        isAuthenticated: true,
        isProfileComplete: false,
        isSessionResolved: true,
        user,
      }),
    );

    expect(
      await screen.findByRole('heading', { name: /let's build your professional profile/i }),
    ).toBeInTheDocument();
  });

  it('redirects authenticated users away from Login to Job Feed when profile is complete', async () => {
    renderRoute(
      '/login',
      createStore({
        accessToken: 'token',
        isAuthenticated: true,
        isProfileComplete: true,
        isSessionResolved: true,
        user,
      }),
    );

    expect(await screen.findByRole('heading', { name: /^job feed$/i })).toBeInTheDocument();
  });

  it('allows users with completed profiles to revisit /profile to upload a new resume', async () => {
    renderRoute(
      '/profile',
      createStore({
        accessToken: 'token',
        isAuthenticated: true,
        isProfileComplete: true,
        isSessionResolved: true,
        user,
      }),
    );

    expect(
      await screen.findByRole('heading', { name: /let's build your professional profile/i }),
    ).toBeInTheDocument();
  });

  it('allows incomplete profiles to access onboarding', async () => {
    renderRoute(
      '/profile',
      createStore({
        accessToken: 'token',
        isAuthenticated: true,
        isProfileComplete: false,
        isSessionResolved: true,
        user,
      }),
    );

    expect(
      await screen.findByRole('heading', { name: /let's build your professional profile/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });

  it('renders the register page at /register', async () => {
    renderRoute('/register');

    expect(await screen.findByRole('heading', { name: /create account/i })).toBeInTheDocument();
  });

  it('sends stored complete profiles to Job Feed from the root route', async () => {
    renderRoute(
      '/',
      createStore({
        accessToken: 'token',
        isAuthenticated: true,
        isProfileComplete: true,
        isSessionResolved: true,
        user,
      }),
    );

    expect(await screen.findByRole('heading', { name: /^job feed$/i })).toBeInTheDocument();
  });
});
