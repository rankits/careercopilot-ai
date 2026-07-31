import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { authReducer } from '@/features/auth/authSlice';

import { AppRouter } from './AppRouter';

vi.mock('@/features/auth/services/auth.service', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
  },
}));

describe('AppRouter auth routes', () => {
  function renderRoute(path: string) {
    const testStore = configureStore({ reducer: { auth: authReducer } });
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <Provider store={testStore}>
          <MemoryRouter initialEntries={[path]}>
            <AppRouter />
          </MemoryRouter>
        </Provider>
      </QueryClientProvider>,
    );
  }

  it('renders the register page at /register', () => {
    renderRoute('/register');

    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
  });

  it('renders the login page at /login', () => {
    renderRoute('/login');

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });

  it('renders app layout for home routes', () => {
    renderRoute('/');

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByLabelText(/primary navigation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dashboard page/i)).toBeInTheDocument();
  });

  it('renders profile onboarding without dashboard navigation', () => {
    renderRoute('/profile');

    expect(
      screen.getByRole('heading', { name: /let's build your professional profile/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/primary navigation/i)).not.toBeInTheDocument();
  });
});
