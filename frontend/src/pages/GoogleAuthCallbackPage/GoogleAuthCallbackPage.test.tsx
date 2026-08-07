import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { STORAGE_KEYS } from '@/constants/storage';
import { authReducer } from '@/features/auth/authSlice';

import { GoogleAuthCallbackPage } from './GoogleAuthCallbackPage';

const { completeGoogleLoginMock } = vi.hoisted(() => ({
  completeGoogleLoginMock: vi.fn(),
}));

vi.mock('@/features/auth/services/auth.service', () => ({
  authService: {
    completeGoogleLogin: completeGoogleLoginMock,
  },
}));

function renderPage(query = 'code=abc&state=xyz') {
  const store = configureStore({ reducer: { auth: authReducer } });

  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[`/auth/google/callback?${query}`]}>
          <Routes>
            <Route path="/auth/google/callback" element={<GoogleAuthCallbackPage />} />
            <Route path="/profile" element={<h1>Profile destination</h1>} />
            <Route path="/jobs-feed" element={<h1>Job feed destination</h1>} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    ),
  };
}

describe('GoogleAuthCallbackPage', () => {
  beforeEach(() => {
    completeGoogleLoginMock.mockReset();
    localStorage.clear();
  });

  it('persists the session and navigates after a successful callback', async () => {
    completeGoogleLoginMock.mockResolvedValue({
      accessToken: 'google-token',
      user: {
        email: 'ada@example.com',
        id: '1',
        isProfileCreated: false,
        name: 'Ada',
        role: 'user' as const,
      },
      returnPath: '/profile',
    });

    const { store } = renderPage();

    expect(
      await screen.findByRole('heading', { name: /profile destination/i }),
    ).toBeInTheDocument();
    expect(store.getState().auth.isAuthenticated).toBe(true);
    expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBe(JSON.stringify('google-token'));
    expect(completeGoogleLoginMock).toHaveBeenCalledWith({ code: 'abc', state: 'xyz' });
  });

  it('shows an error when Google returns an OAuth error', async () => {
    renderPage('error=access_denied');

    await waitFor(() => {
      expect(screen.getByText(/google sign-in was cancelled or denied/i)).toBeInTheDocument();
    });
    expect(completeGoogleLoginMock).not.toHaveBeenCalled();
  });
});
