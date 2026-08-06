import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/organisms/Toast/ToastProvider';

import * as useLogoutModule from '@/features/auth/hooks/useLogout';

import { ROUTES } from '@/constants/routes';
import { STORAGE_KEYS } from '@/constants/storage';
import { authReducer } from '@/features/auth/authSlice';
import type { User } from '@/features/auth/types/auth.types';
import type { UploadedResumeVersion } from '@/features/resume/types/resume.types';
import * as material from '@/lib/material';

import { AppLayout } from './AppLayout';

const { downloadResumeMock, listResumesMock, logoutMock } = vi.hoisted(() => ({
  downloadResumeMock: vi.fn(),
  listResumesMock: vi.fn(),
  logoutMock: vi.fn(),
}));

vi.mock('@/features/auth/services/auth.service', () => ({
  authService: {
    logout: logoutMock,
  },
}));

vi.mock('@/features/resume/services/resume.service', () => ({
  resumeService: {
    downloadResume: downloadResumeMock,
    listResumes: listResumesMock,
  },
}));

vi.mock('@/lib/material', async () => {
  const actual = await vi.importActual<typeof material>('@/lib/material');
  return {
    ...actual,
    useMediaQuery: vi.fn(),
  };
});

interface RenderLayoutOptions {
  initialEntries?: string[];
  user?: User | null;
}

function renderLayout({
  initialEntries = ['/app'],
  user = { email: 'ada@example.com', id: '1', name: 'Ada Lovelace', role: 'user' },
}: RenderLayoutOptions = {}) {
  const store = configureStore({
    preloadedState: {
      auth: {
        accessToken: user ? 'token' : null,
        error: null,
        isAuthenticated: Boolean(user),
        isLoading: false,
        isProfileComplete: Boolean(user),
        isSessionResolved: true,
        user: user ?? null,
      },
    },
    reducer: { auth: authReducer },
  });
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });

  return {
    store,
    ...render(
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <ToastProvider>
            <MemoryRouter initialEntries={initialEntries}>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/app" element={<h1>Dashboard</h1>} />
                  <Route path={ROUTES.SAVED_JOBS} element={<h1>Saved Jobs Page</h1>} />
                  <Route path={ROUTES.APPLICATIONS} element={<h1>Applications Page</h1>} />
                  <Route path={ROUTES.JOB_FEED} element={<h1>Job Feed Page</h1>} />
                  <Route path="/jobs/123" element={<h1>Job Details Page</h1>} />
                  <Route path={ROUTES.SAVED_RESUMES} element={<h1>Saved Resumes Page</h1>} />
                  <Route
                    path={`${ROUTES.SAVED_RESUMES}/123`}
                    element={<h1>Resume Detail Page</h1>}
                  />
                  <Route path={ROUTES.RESUME_BUILDER} element={<h1>Resume Builder Page</h1>} />
                  <Route
                    path={`${ROUTES.RESUME_BUILDER}/123`}
                    element={<h1>Resume Builder Step Page</h1>}
                  />
                  <Route path={ROUTES.PROFILE_EDIT} element={<h1>Profile Edit Destination</h1>} />
                </Route>
                <Route path="/login" element={<h1>Login destination</h1>} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </Provider>
      </QueryClientProvider>,
    ),
  };
}

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    clear: () => {
      store = {};
    },
    getItem: (key: string) => store[key] ?? null,
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: localStorageMock,
  writable: true,
});

describe('AppLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(material.useMediaQuery).mockReturnValue(false);
    logoutMock.mockResolvedValue({ message: 'Logged out successfully' });
    listResumesMock.mockResolvedValue([]);
    downloadResumeMock.mockResolvedValue(undefined);
    localStorage.clear();
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, JSON.stringify('token'));
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({ email: 'ada@example.com', id: '1' }));
    localStorage.setItem(STORAGE_KEYS.PROFILE_COMPLETE, JSON.stringify(true));
  });

  describe('logout flow', () => {
    it('calls the logout API, shows the API message, clears the session, and navigates to login', async () => {
      const user = userEvent.setup();
      const { store } = renderLayout();

      await user.click(screen.getByRole('button', { name: /user menu/i }));
      await user.click(screen.getByRole('menuitem', { name: /logout/i }));

      await waitFor(() => expect(logoutMock).toHaveBeenCalledTimes(1));
      expect(await screen.findByText(/logged out successfully/i)).toBeInTheDocument();
      expect(store.getState().auth.isAuthenticated).toBe(false);
      expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
      expect(
        await screen.findByRole('heading', { name: /login destination/i }),
      ).toBeInTheDocument();
    });

    it('does not offer Upload Resume in the user menu', async () => {
      const user = userEvent.setup();
      renderLayout();

      await user.click(screen.getByRole('button', { name: /user menu/i }));

      expect(screen.queryByRole('menuitem', { name: /upload resume/i })).not.toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /edit profile/i })).toBeInTheDocument();
    });

    it('still clears the session and shows an error toast when the logout API fails', async () => {
      const user = userEvent.setup();
      logoutMock.mockRejectedValueOnce(new Error('Network down'));
      const { store } = renderLayout();

      await user.click(screen.getByRole('button', { name: /user menu/i }));
      await user.click(screen.getByRole('menuitem', { name: /logout/i }));

      await waitFor(() => expect(logoutMock).toHaveBeenCalledTimes(1));
      expect(await screen.findByText(/signed out locally/i)).toBeInTheDocument();
      expect(store.getState().auth.isAuthenticated).toBe(false);
      expect(
        await screen.findByRole('heading', { name: /login destination/i }),
      ).toBeInTheDocument();
    });

    it('does not invoke logout again if isLoggingOut is already true', async () => {
      const user = userEvent.setup();
      const mockLogoutFn = vi.fn();
      vi.spyOn(useLogoutModule, 'useLogout').mockReturnValue({
        isLoggingOut: true,
        logout: mockLogoutFn,
      });

      renderLayout();

      await user.click(screen.getByRole('button', { name: /user menu/i }));
      await user.click(screen.getByRole('menuitem', { name: /logout/i }));

      expect(mockLogoutFn).not.toHaveBeenCalled();
    });
  });

  describe('settings and navigation', () => {
    it('navigates to edit profile page when settings is clicked', async () => {
      const user = userEvent.setup();
      renderLayout();

      await user.click(screen.getByRole('button', { name: /user menu/i }));
      await user.click(screen.getByRole('menuitem', { name: /edit profile/i }));

      expect(
        await screen.findByRole('heading', { name: /profile edit destination/i }),
      ).toBeInTheDocument();
    });

    it.each([
      [ROUTES.SAVED_JOBS, 'Saved Jobs Page', 'Saved Jobs'],
      [ROUTES.APPLICATIONS, 'Applications Page', 'Applications'],
      [ROUTES.JOB_FEED, 'Job Feed Page', 'Jobs Feed'],
      ['/jobs/123', 'Job Details Page', 'Jobs Feed'],
      [ROUTES.SAVED_RESUMES, 'Saved Resumes Page', 'Saved Resumes'],
      [`${ROUTES.SAVED_RESUMES}/123`, 'Resume Detail Page', 'Saved Resumes'],
      [ROUTES.RESUME_BUILDER, 'Resume Builder Page', 'Resume Builder'],
      [`${ROUTES.RESUME_BUILDER}/123`, 'Resume Builder Step Page', 'Resume Builder'],
      ['/app', 'Dashboard', 'Dashboard'],
    ])(
      'highlights active nav item for route %s',
      async (path, headingText, expectedActiveNavLabel) => {
        renderLayout({ initialEntries: [path] });
        expect(await screen.findByRole('heading', { name: headingText })).toBeInTheDocument();

        const activeNavItem = screen.getByRole('link', { name: expectedActiveNavLabel });
        expect(activeNavItem).toBeInTheDocument();
      },
    );

    it('toggles sidebar variant on click', async () => {
      const user = userEvent.setup();
      renderLayout();

      const toggleButton = screen.getByRole('button', { name: /collapse sidebar/i });
      await user.click(toggleButton);

      expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument();
    });
  });

  describe('user labels and roles', () => {
    it('renders Admin label when user role is admin', () => {
      renderLayout({
        user: { email: 'admin@example.com', id: '1', name: 'Admin User', role: 'admin' },
      });

      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('renders Admin label when user role is capital ADMIN', () => {
      renderLayout({
        user: { email: 'admin2@example.com', id: '2', name: 'Super Admin', role: 'ADMIN' },
      });

      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('falls back to email when user name is missing', () => {
      renderLayout({
        user: { email: 'noname@example.com', id: '3', role: 'user' },
      });

      expect(screen.getByText('noname@example.com')).toBeInTheDocument();
    });

    it('falls back to User when user state is null', () => {
      renderLayout({ user: null });

      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });

    it('passes user profile image URL when present', () => {
      renderLayout({
        user: {
          email: 'pic@example.com',
          id: '4',
          name: 'Pic User',
          profileImage: 'https://example.com/avatar.jpg',
          role: 'user',
        },
      });

      const avatarImg = screen.getByAltText('Pic User');
      expect(avatarImg).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });
  });

  describe('resumes and downloading', () => {
    const mockResume: UploadedResumeVersion = {
      id: 'resume-1',
      mimeType: 'application/pdf',
      originalName: 'My_Resume.pdf',
      processedAt: '2026-08-01T10:00:00Z',
      sizeBytes: 1024,
      status: 'PROCESSED',
      uploadedAt: '2026-08-01T10:00:00Z',
      version: 1,
    };

    it('does not fetch uploaded resumes on layout mount', async () => {
      renderLayout();

      expect(await screen.findByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
      expect(listResumesMock).not.toHaveBeenCalled();
    });

    it('loads uploaded resumes when opening resume versions', async () => {
      const user = userEvent.setup();
      listResumesMock.mockRejectedValueOnce(new Error('Failed to load resumes'));

      renderLayout();

      await user.click(screen.getByRole('button', { name: /view all versions/i }));

      await waitFor(() => expect(listResumesMock).toHaveBeenCalledTimes(1));
      expect(await screen.findByText(/no uploaded resumes yet/i)).toBeInTheDocument();
    });

    it('renders mobile layout when screen is mobile width', () => {
      vi.mocked(material.useMediaQuery).mockReturnValue(true);

      renderLayout();

      expect(screen.getByRole('navigation', { name: /mobile navigation/i })).toBeInTheDocument();
    });

    it('loads resumes on download latest click when none exist', async () => {
      const user = userEvent.setup();
      renderLayout();

      expect(listResumesMock).not.toHaveBeenCalled();

      await user.click(screen.getByRole('button', { name: /download latest/i }));

      await waitFor(() => expect(listResumesMock).toHaveBeenCalledTimes(1));
      expect(downloadResumeMock).not.toHaveBeenCalled();
    });

    it('downloads the latest resume from sidebar', async () => {
      const user = userEvent.setup();
      listResumesMock.mockResolvedValue([mockResume]);

      renderLayout();

      const downloadButton = screen.getByRole('button', { name: /download latest/i });
      await user.click(downloadButton);

      await waitFor(() => expect(listResumesMock).toHaveBeenCalledTimes(1));
      expect(downloadResumeMock).toHaveBeenCalledWith('resume-1', 'My_Resume.pdf');
    });

    it('opens versions dialog, downloads a version, and closes the dialog', async () => {
      const user = userEvent.setup();
      listResumesMock.mockResolvedValue([mockResume]);

      renderLayout();

      const versionsButton = screen.getByRole('button', { name: /view all versions/i });
      await user.click(versionsButton);

      expect(
        await screen.findByRole('dialog', { name: /uploaded resume versions/i }),
      ).toBeInTheDocument();

      const dialogDownloadBtn = screen.getByRole('button', { name: /download/i });
      await user.click(dialogDownloadBtn);

      expect(downloadResumeMock).toHaveBeenCalledWith('resume-1', 'My_Resume.pdf');

      const closeBtn = screen.getByRole('button', { name: /^close$/i });
      await user.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('shows error toast when downloading resume throws an Error instance', async () => {
      const user = userEvent.setup();
      listResumesMock.mockResolvedValue([mockResume]);
      downloadResumeMock.mockRejectedValueOnce(new Error('File server unavailable'));

      renderLayout();

      const downloadButton = screen.getByRole('button', { name: /download latest/i });
      await user.click(downloadButton);

      await waitFor(() => expect(listResumesMock).toHaveBeenCalledTimes(1));
      expect(await screen.findByText('File server unavailable')).toBeInTheDocument();
    });

    it('shows fallback error toast when downloading resume throws a non-Error', async () => {
      const user = userEvent.setup();
      listResumesMock.mockResolvedValue([mockResume]);
      downloadResumeMock.mockRejectedValueOnce('Network error string');

      renderLayout();

      const downloadButton = screen.getByRole('button', { name: /download latest/i });
      await user.click(downloadButton);

      await waitFor(() => expect(listResumesMock).toHaveBeenCalledTimes(1));
      expect(await screen.findByText('Unable to download this resume.')).toBeInTheDocument();
    });
  });
});
