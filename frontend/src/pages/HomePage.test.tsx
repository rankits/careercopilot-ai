import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HomePage } from './HomePage';

const getReadinessMock = vi.fn();

vi.mock('@/features/recommendations/hooks/useRecommendations', () => ({
  useRecommendationReadiness: () => getReadinessMock(),
}));

describe('HomePage', () => {
  function renderPage() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  beforeEach(() => {
    getReadinessMock.mockReturnValue({
      data: {
        canGenerateFromProfile: true,
        blockers: [],
      },
    });
  });

  it('renders home content without fabricated recommendation data', () => {
    renderPage();

    expect(screen.getByLabelText(/dashboard page/i)).toBeInTheDocument();
    expect(screen.getByText(/resume score/i)).toBeInTheDocument();
    expect(screen.getByText(/recommended jobs/i)).toBeInTheDocument();
    expect(screen.queryByText(/avg\. match score/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/best job match/i)).not.toBeInTheDocument();
    expect(screen.getByText(/your profile is ready/i)).toBeInTheDocument();
  });

  it('navigates to For You from the recommendations CTA', async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/for-you" element={<p>For You opened</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole('button', { name: /go to for you/i }));

    expect(screen.getByText(/for you opened/i)).toBeInTheDocument();
  });
});
