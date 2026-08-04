import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AutoApplyPage } from './AutoApplyPage';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AutoApplyPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AutoApplyPage', () => {
  it('renders the heading and the profile tab by default', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /auto apply/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /profile/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/candidate application profile/i)).toBeInTheDocument();
  });

  it('never claims full autopilot is enabled', () => {
    renderPage();
    expect(screen.getByText(/full autopilot is not enabled yet/i)).toBeInTheDocument();
  });

  it('switches to the submissions tab on click', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: /submissions/i }));

    expect(screen.getByText(/track a job for auto-apply/i)).toBeInTheDocument();
  });

  it('switches to the rules tab and never exposes an autopilot on/off toggle', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: /^rules$/i }));

    expect(screen.getByText(/eligibility & autopilot policy/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/enable autopilot/i)).not.toBeInTheDocument();
  });
});
