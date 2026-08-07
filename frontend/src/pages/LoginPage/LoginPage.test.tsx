import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/organisms/Toast/ToastProvider';

import { STORAGE_KEYS } from '@/constants/storage';
import { authReducer } from '@/features/auth/authSlice';

import { LoginPage } from './LoginPage';

const { loginMock, forgotPasswordMock, resetPasswordMock, startGoogleLoginMock } = vi.hoisted(
  () => ({
    loginMock: vi.fn(),
    forgotPasswordMock: vi.fn(),
    resetPasswordMock: vi.fn(),
    startGoogleLoginMock: vi.fn(),
  }),
);

vi.mock('@/features/auth/services/auth.service', () => ({
  authService: {
    login: loginMock,
    forgotPassword: forgotPasswordMock,
    resetPassword: resetPasswordMock,
    startGoogleLogin: startGoogleLoginMock,
    refreshSession: vi.fn().mockRejectedValue(new Error('No session')),
    getCurrentUser: vi.fn(),
  },
}));

function renderPage() {
  const testStore = configureStore({ reducer: { auth: authReducer } });
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });

  return {
    queryClient,
    store: testStore,
    ...render(
      <QueryClientProvider client={queryClient}>
        <Provider store={testStore}>
          <ToastProvider>
            <MemoryRouter initialEntries={['/login']}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/profile" element={<h1>Profile destination</h1>} />
                <Route path="/jobs-feed" element={<h1>Job feed destination</h1>} />
                <Route path="/register" element={<h1>Register destination</h1>} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </Provider>
      </QueryClientProvider>,
    ),
  };
}

async function completeValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole('textbox', { name: /email address/i }), '  ADA@EXAMPLE.COM  ');
  await user.type(screen.getByLabelText(/^password$/i), 'password123');
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

describe('LoginPage', () => {
  beforeEach(() => {
    loginMock.mockReset();
    forgotPasswordMock.mockReset();
    resetPasswordMock.mockReset();
    startGoogleLoginMock.mockReset();
    forgotPasswordMock.mockResolvedValue({
      message: 'If an account with that email exists, a verification code has been sent.',
      status: 'success',
    });
    resetPasswordMock.mockResolvedValue({
      message: 'Password has been reset. Please sign in with your new password.',
      status: 'success',
    });
    localStorage.clear();
  });

  it('starts Google sign-in and redirects to the authorization URL', async () => {
    const user = userEvent.setup();
    const assignMock = vi.fn();
    const locationDescriptor = Object.getOwnPropertyDescriptor(window, 'location');
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        assign: assignMock,
        hash: '',
        href: 'http://localhost/login',
        pathname: '/login',
        search: '',
      },
    });
    startGoogleLoginMock.mockResolvedValue({
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth?mock=1',
    });

    try {
      renderPage();

      await user.click(screen.getByRole('button', { name: /continue with google/i }));

      await waitFor(() => expect(startGoogleLoginMock).toHaveBeenCalledWith(undefined));
      expect(assignMock).toHaveBeenCalledWith(
        'https://accounts.google.com/o/oauth2/v2/auth?mock=1',
      );
    } finally {
      if (locationDescriptor) {
        Object.defineProperty(window, 'location', locationDescriptor);
      }
    }
  });

  it('shows a coming-soon toast for LinkedIn sign-in', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /continue with linkedin/i }));

    expect(await screen.findByText(/linkedin sign-in is not available yet/i)).toBeInTheDocument();
  });

  it('renders the shared login form and navigates to registration', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole('main')).toHaveStyle({ minHeight: '100dvh' });
    expect(screen.getByRole('heading', { name: /welcome back!/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /careercopilot/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /careercopilot/i })).not.toHaveStyle({
      position: 'absolute',
    });
    expect(
      screen.getByRole('region', { hidden: true, name: /career copilot product overview/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { hidden: true, name: /ai platform illustration/i }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('heading', { hidden: true, name: /find the right opportunities/i })
        .length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole('region', { name: /career copilot mobile introduction/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/^smart job matching$/i)).toBeInTheDocument();
    expect(screen.getByText(/^ai-powered guidance$/i)).toBeInTheDocument();
    expect(screen.getByText(/^application tracking$/i)).toBeInTheDocument();
    expect(screen.queryByText(/^resume score$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^jobs aggregated$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^your data is safe$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^privacy first$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^ai you can trust$/i)).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /remember me/i })).toBeChecked();

    await user.click(screen.getByRole('link', { name: /create account/i }));

    expect(screen.getByRole('heading', { name: /register destination/i })).toBeInTheDocument();
  });

  it('opens and closes the forgot password dialog', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('link', { name: /forgot password/i }));

    expect(await screen.findByRole('heading', { name: /forgot password\?/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /email address/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close dialog/i }));

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: /forgot password\?/i })).not.toBeInTheDocument(),
    );
  });

  it('blocks missing and malformed credentials before calling the API', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /^login$/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: /email address/i }), 'not-an-email');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.click(screen.getByRole('button', { name: /^login$/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('logs in and redirects to onboarding when the profile is incomplete', async () => {
    const user = userEvent.setup();
    const response = {
      accessToken: 'token',
      user: {
        email: 'ada@example.com',
        id: '1',
        isProfileCreated: false,
        name: 'Ada',
        role: 'user' as const,
      },
    };
    loginMock.mockResolvedValue(response);
    const { queryClient, store } = renderPage();

    await completeValidForm(user);
    await user.click(screen.getByRole('button', { name: /^login$/i }));

    await waitFor(() =>
      expect(loginMock).toHaveBeenCalledWith({
        email: 'ada@example.com',
        password: 'password123',
        rememberMe: true,
      }),
    );
    expect(store.getState().auth.isAuthenticated).toBe(true);
    expect(store.getState().auth.isProfileComplete).toBe(false);
    expect(store.getState().auth.accessToken).toBe('token');
    expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.PROFILE_COMPLETE)).toBe(JSON.stringify(false));
    expect(localStorage.getItem(STORAGE_KEYS.USER_ID)).toBe(JSON.stringify('1'));
    expect(
      await screen.findByRole('heading', { name: /profile destination/i }),
    ).toBeInTheDocument();
    expect(
      queryClient.getMutationCache().find({ mutationKey: ['auth', 'login'] })?.state.status,
    ).toBe('success');
  });

  it('logs in and redirects to the job feed when the profile is complete', async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValue({
      accessToken: 'token',
      user: {
        email: 'ada@example.com',
        id: '1',
        isProfileCreated: true,
        name: 'Ada',
        role: 'user' as const,
      },
    });
    const { store } = renderPage();

    await completeValidForm(user);
    await user.click(screen.getByRole('button', { name: /^login$/i }));

    expect(
      await screen.findByRole('heading', { name: /job feed destination/i }),
    ).toBeInTheDocument();
    expect(store.getState().auth.isProfileComplete).toBe(true);
    expect(localStorage.getItem(STORAGE_KEYS.PROFILE_COMPLETE)).toBe(JSON.stringify(true));
  });

  it('disables submission while pending and prevents duplicate requests', async () => {
    const user = userEvent.setup();
    let resolveRequest: (() => void) | undefined;
    loginMock.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = () =>
          resolve({
            accessToken: 'token',
            user: {
              email: 'ada@example.com',
              id: '1',
              isProfileCreated: false,
              name: 'Ada',
              role: 'user',
            },
          });
      }),
    );
    renderPage();

    await completeValidForm(user);
    const submitButton = screen.getByRole('button', { name: /^login$/i });
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    fireEvent.click(submitButton);
    expect(loginMock).toHaveBeenCalledTimes(1);

    resolveRequest?.();
  });

  it('shows a safe API error and permits retry', async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValueOnce(new Error('Sensitive server detail')).mockResolvedValueOnce({
      accessToken: 'token',
      user: {
        email: 'ada@example.com',
        id: '1',
        isProfileCreated: false,
        name: 'Ada',
        role: 'user',
      },
    });
    renderPage();

    await completeValidForm(user);
    await user.click(screen.getByRole('button', { name: /^login$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /unable to log in\. please try again/i,
    );
    expect(screen.getByRole('button', { name: /^login$/i })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: /^login$/i }));

    expect(loginMock).toHaveBeenCalledTimes(2);
    expect(
      await screen.findByRole('heading', { name: /profile destination/i }),
    ).toBeInTheDocument();
  });

  it('shows the backend login error message when the API provides one', async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        data: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          requestId: '7b5b53e2-fcb4-43c8-b081-7dc26240182b',
          status: 'error',
        },
      },
    });
    renderPage();

    await completeValidForm(user);
    await user.click(screen.getByRole('button', { name: /^login$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid email or password/i);
  });
});
