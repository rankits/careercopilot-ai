import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { JobFeedPage } from './JobFeedPage';

describe('JobFeedPage', () => {
  it('renders job feed filters and job cards', () => {
    render(<JobFeedPage />);

    expect(screen.getByRole('heading', { name: /job feed/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /all jobs/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ai recommended/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /apply now/i })).toHaveLength(7);
    expect(screen.getByText(/microsoft/i)).toBeInTheDocument();
  });

  it('filters jobs from the selected filter', async () => {
    const user = userEvent.setup();

    render(<JobFeedPage />);

    await user.click(screen.getByRole('button', { name: /remote/i }));

    expect(screen.getByRole('button', { name: /remote/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('button', { name: /apply now/i })).toHaveLength(3);
    expect(screen.queryByText(/google/i)).not.toBeInTheDocument();
  });

  it('filters jobs from salary and experience dropdowns', async () => {
    const user = userEvent.setup();

    render(<JobFeedPage />);

    await user.click(screen.getByRole('button', { name: /salary/i }));
    await user.click(screen.getByRole('menuitem', { name: /under 15 lpa/i }));

    expect(screen.getAllByRole('button', { name: /apply now/i })).toHaveLength(2);
    expect(screen.getByText(/adobe/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /experience/i }));
    await user.click(screen.getByRole('menuitem', { name: /0 - 2 yrs/i }));

    expect(screen.getByText(/netflix/i)).toBeInTheDocument();
  });
});
