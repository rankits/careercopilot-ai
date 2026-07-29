import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_SIDEBAR_ITEMS } from './constants';
import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
  it('renders the default desktop navigation', () => {
    render(<Sidebar />);

    expect(screen.getByLabelText(/primary navigation/i)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /career copilot/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dashboard/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('button', { name: /upload now/i })).toBeInTheDocument();
  });

  it('collapses labels for icon-only mode', () => {
    render(<Sidebar variant="collapsed" />);

    expect(screen.getByRole('img', { name: /career copilot/i })).toHaveAttribute(
      'src',
      expect.stringContaining('penguin'),
    );
    expect(screen.queryByText(/upload resume/i)).not.toBeInTheDocument();
  });

  it('notifies when a navigation item is selected', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();

    render(<Sidebar onItemSelect={handleSelect} />);

    await user.click(screen.getByRole('button', { name: /job search/i }));

    expect(handleSelect).toHaveBeenCalledWith(DEFAULT_SIDEBAR_ITEMS[1]);
  });

  it('requests collapsed variant from the toggle button', async () => {
    const user = userEvent.setup();
    const handleVariantChange = vi.fn();

    render(<Sidebar onVariantChange={handleVariantChange} />);

    await user.click(screen.getByRole('button', { name: /collapse sidebar/i }));

    expect(handleVariantChange).toHaveBeenCalledWith('collapsed');
  });

  it('renders bottom navigation for mobile mode', () => {
    render(<Sidebar mobileMode="bottomNav" />);

    expect(screen.getByLabelText(/mobile navigation/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });
});
