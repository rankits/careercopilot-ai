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

const { loginMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
}));

vi.mock('@/features/auth/services/auth.service', () => ({
  authService: {
    login: loginMock,
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

describe('LoginPage', () => {
  beforeEach(() => {
    loginMock.mockReset();
    localStorage.clear();
  });

  it('renders the shared login form and navigates to registration', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole('main')).toHaveStyle({ overflow: 'hidden' });
    expect(screen.getByRole('heading', { name: /welcome back!/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /careercopilot/i })).toHaveStyle({
      position: 'absolute',
    });
    expect(screen.getByRole('img', { name: /ai platform illustration/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /ai platform illustration/i })).toHaveStyle({
      maxWidth: '40rem',
      objectFit: 'contain',
    });
    expect(screen.getByRole('img', { name: /ai platform illustration/i })).not.toHaveStyle({
      maxHeight: '15rem',
    });
    expect(screen.getByRole('region', { name: /career copilot product overview/i })).toHaveStyle({
      display: 'grid',
    });
    expect(screen.getByRole('heading', { name: /find the right opportunities/i })).toHaveStyle({
      maxWidth: '30rem',
    });
    expect(
      screen.getByRole('heading', { name: /find the right opportunities/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/^smart job matching$/i)).toBeInTheDocument();
    expect(screen.getByText(/^ai-powered guidance$/i)).toBeInTheDocument();
    expect(screen.getByText(/^application tracking$/i)).toBeInTheDocument();
    expect(screen.queryByText(/^resume score$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^jobs aggregated$/i)).not.toBeInTheDocument();
    expect(screen.getByText(/^your data is safe$/i)).toBeInTheDocument();
    expect(screen.getByText(/^privacy first$/i)).toBeInTheDocument();
    expect(screen.getByText(/^ai you can trust$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/security and trust/i)).toHaveStyle({
      backgroundColor: 'rgba(255, 255, 255, 0.82)',
    });
    expect(screen.getByRole('checkbox', { name: /remember me/i })).toBeChecked();

    await user.click(screen.getByRole('link', { name: /create account/i }));

    expect(screen.getByRole('heading', { name: /register destination/i })).toBeInTheDocument();
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
    expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBe(JSON.stringify('token'));
    expect(localStorage.getItem(STORAGE_KEYS.PROFILE_COMPLETE)).toBe(JSON.stringify(false));
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
});
