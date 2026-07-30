import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { HomePage } from './HomePage';

describe('HomePage', () => {
  function renderPage() {
    return render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
  }

  it('renders home content', () => {
    renderPage();

    expect(screen.getByLabelText(/dashboard page/i)).toBeInTheDocument();
    expect(screen.getByText(/resume score/i)).toBeInTheDocument();
    expect(screen.getByText(/recommended jobs/i)).toBeInTheDocument();
  });

  it('opens the job feed from recommended jobs action', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/jobs-feed" element={<p>Job feed opened</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /view all/i }));

    expect(screen.getByText(/job feed opened/i)).toBeInTheDocument();
  });
});
