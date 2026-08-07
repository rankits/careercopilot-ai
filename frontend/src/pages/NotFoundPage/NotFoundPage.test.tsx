import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@/constants/routes';
import { authReducer } from '@/features/auth/authSlice';
import type { AuthState } from '@/features/auth/types/auth.types';

import { NotFoundPage } from './NotFoundPage';

vi.mock('@/features/auth/hooks/useAuthBootstrap', () => ({
  useAuthBootstrap: () => ({ isSessionResolved: true }),
}));

function renderPage(authOverrides: Partial<AuthState> = {}) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isProfileComplete: false,
        isSessionResolved: true,
        isLoading: false,
        error: null,
        ...authOverrides,
      },
    },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/missing-page']}>
        <Routes>
          <Route path="/missing-page" element={<NotFoundPage />} />
          <Route path={ROUTES.HOME} element={<h1>Landing destination</h1>} />
          <Route path={ROUTES.DASHBOARD} element={<h1>Dashboard destination</h1>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('NotFoundPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('navigates to the landing page when the user is not logged in', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /return home/i }));

    expect(
      await screen.findByRole('heading', { name: /landing destination/i }),
    ).toBeInTheDocument();
  });

  it('navigates to the dashboard when the user is logged in', async () => {
    const user = userEvent.setup();
    renderPage({
      isAuthenticated: true,
      user: { id: 'user-1', email: 'ada@example.com', name: 'Ada', role: 'user' },
    });

    await user.click(screen.getByRole('button', { name: /return home/i }));

    expect(
      await screen.findByRole('heading', { name: /dashboard destination/i }),
    ).toBeInTheDocument();
  });
});
