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

  it('renders home content without fabricated recommendation data', () => {
    renderPage();

    expect(screen.getByLabelText(/dashboard page/i)).toBeInTheDocument();
    expect(screen.getByText(/resume score/i)).toBeInTheDocument();
    expect(screen.getByText(/recommended jobs/i)).toBeInTheDocument();
    expect(screen.queryByText(/avg\. match score/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/best job match/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/personalized matches are generated on the for you page/i),
    ).toBeInTheDocument();
  });

  it('navigates to For You from the recommendations CTA', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/for-you" element={<p>For You opened</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /go to for you/i }));

    expect(screen.getByText(/for you opened/i)).toBeInTheDocument();
  });
});
