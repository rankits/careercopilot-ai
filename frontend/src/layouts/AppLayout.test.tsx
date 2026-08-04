import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/organisms/Toast/ToastProvider';

import { STORAGE_KEYS } from '@/constants/storage';
import { authReducer } from '@/features/auth/authSlice';

import { AppLayout } from './AppLayout';

const { logoutMock } = vi.hoisted(() => ({
  logoutMock: vi.fn(),
}));

vi.mock('@/features/auth/services/auth.service', () => ({
  authService: {
    logout: logoutMock,
  },
}));

function renderLayout() {
  const store = configureStore({
    preloadedState: {
      auth: {
        accessToken: 'token',
        error: null,
        isAuthenticated: true,
        isLoading: false,
        isProfileComplete: true,
        isSessionResolved: true,
        user: {
          email: 'ada@example.com',
          id: '1',
          name: 'Ada Lovelace',
          role: 'user' as const,
        },
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
            <MemoryRouter initialEntries={['/app']}>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/app" element={<h1>Dashboard</h1>} />
                </Route>
                <Route path="/login" element={<h1>Login destination</h1>} />
                <Route path="/profile" element={<h1>Upload resume destination</h1>} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </Provider>
      </QueryClientProvider>,
    ),
  };
}

describe('AppLayout logout', () => {
  beforeEach(() => {
    logoutMock.mockReset();
    logoutMock.mockResolvedValue({ message: 'Logged out successfully' });
    localStorage.clear();
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, JSON.stringify('token'));
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({ id: '1', email: 'ada@example.com' }));
    localStorage.setItem(STORAGE_KEYS.PROFILE_COMPLETE, JSON.stringify(true));
  });

  it('calls the logout API, shows the API message, clears the session, and navigates to login', async () => {
    const user = userEvent.setup();
    const { store } = renderLayout();

    await user.click(screen.getByRole('button', { name: /user menu/i }));
    await user.click(screen.getByRole('menuitem', { name: /logout/i }));

    await waitFor(() => expect(logoutMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/logged out successfully/i)).toBeInTheDocument();
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
    expect(await screen.findByRole('heading', { name: /login destination/i })).toBeInTheDocument();
  });

  it('navigates to the upload-resume page when "Upload Resume" is clicked', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole('button', { name: /user menu/i }));
    await user.click(screen.getByRole('menuitem', { name: /upload resume/i }));

    expect(
      await screen.findByRole('heading', { name: /upload resume destination/i }),
    ).toBeInTheDocument();
  });

  it('still clears the session and shows an error toast when the logout API fails', async () => {
    const user = userEvent.setup();
    logoutMock.mockRejectedValueOnce(new Error('Network down'));
    const { store } = renderLayout();

    await user.click(screen.getByRole('button', { name: /user menu/i }));
    await user.click(screen.getByRole('menuitem', { name: /logout/i }));

    await waitFor(() => expect(logoutMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/unable to log out\. please try again/i)).toBeInTheDocument();
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(await screen.findByRole('heading', { name: /login destination/i })).toBeInTheDocument();
  });
});
