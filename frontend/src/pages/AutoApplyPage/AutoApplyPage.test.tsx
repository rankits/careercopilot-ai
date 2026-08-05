import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AutoApplyPage } from './AutoApplyPage';

function renderPage(initialEntry = '/auto-apply') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <AutoApplyPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AutoApplyPage', () => {
  it('renders the heading and the profile tab by default', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /^Auto Apply$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /profile/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/Your Auto Apply preferences/i)).toBeInTheDocument();
  });

  it('opens the submissions tab from ?tab=submissions', () => {
    renderPage('/auto-apply?tab=submissions');

    expect(screen.getByRole('tab', { name: /submissions/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByText(/Track a job/i)).toBeInTheDocument();
  });

  it('hides premature UI on the submissions tab', () => {
    // Navigate directly to submissions tab where these UI elements would potentially render
    renderPage('/auto-apply?tab=submissions');

    expect(screen.queryByRole('button', { name: /^Approve$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Continue to apply$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Retry$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/^Processing…$/)).not.toBeInTheDocument();
  });

  it('switches to the submissions tab on click', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: /submissions/i }));

    expect(screen.getByText(/Track a job/i)).toBeInTheDocument();
  });

  it('switches to the rules tab and never exposes an autopilot on/off toggle', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: /^rules$/i }));

    expect(screen.getByText(/eligibility & autopilot policy/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/enable autopilot/i)).not.toBeInTheDocument();
  });
});
