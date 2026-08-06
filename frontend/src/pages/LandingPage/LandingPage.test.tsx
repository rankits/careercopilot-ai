import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { authReducer } from '@/features/auth/authSlice';

import { LandingPage } from './LandingPage';

vi.mock('@/features/auth/hooks/useAuthBootstrap', () => ({
  useAuthBootstrap: () => ({ isSessionResolved: true }),
}));

function renderLanding() {
  const store = configureStore({
    preloadedState: {
      auth: {
        accessToken: null,
        error: null,
        isAuthenticated: false,
        isLoading: false,
        isProfileComplete: false,
        isSessionResolved: true,
        user: null,
      },
    },
    reducer: { auth: authReducer },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    </Provider>,
  );
}

describe('LandingPage', () => {
  it('renders hero headline and primary CTAs without an auth form', () => {
    renderLanding();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/smarter job search/i);
    expect(screen.getAllByRole('link', { name: /get started/i }).length).toBeGreaterThan(0);
    expect(
      screen.getByRole('heading', { name: /everything you need to land the role/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/twitter/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/linkedin/i)).toBeInTheDocument();
  });
});
