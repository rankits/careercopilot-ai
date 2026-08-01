import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_SIDEBAR_ITEMS } from './constants';
import { Sidebar } from './Sidebar';

function renderSidebar(ui: ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('Sidebar', () => {
  it('renders the default desktop navigation including Saved Jobs', () => {
    renderSidebar(<Sidebar />);

    expect(screen.getByLabelText(/primary navigation/i)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /career copilot/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: /jobs feed/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /saved jobs/i })).toHaveAttribute(
      'href',
      '/saved-jobs',
    );
    expect(screen.getByRole('link', { name: /for you/i })).toHaveAttribute('href', '/for-you');
    expect(screen.getByRole('button', { name: /upload now/i })).toBeInTheDocument();
  });

  it('collapses labels for icon-only mode', () => {
    renderSidebar(<Sidebar variant="collapsed" />);

    expect(screen.getByRole('img', { name: /career copilot/i })).toHaveAttribute(
      'src',
      expect.stringContaining('penguin'),
    );
    expect(screen.queryByText(/upload resume/i)).not.toBeInTheDocument();
  });

  it('notifies when a navigation item is selected', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    const items = [
      {
        icon: DEFAULT_SIDEBAR_ITEMS[1]!.icon,
        id: 'custom-jobs',
        label: 'Custom Jobs',
      },
    ];

    renderSidebar(<Sidebar items={items} onItemSelect={handleSelect} />);

    await user.click(screen.getByRole('button', { name: /custom jobs/i }));

    expect(handleSelect).toHaveBeenCalledWith(items[0]);
  });

  it('requests collapsed variant from the toggle button', async () => {
    const user = userEvent.setup();
    const handleVariantChange = vi.fn();

    renderSidebar(<Sidebar onVariantChange={handleVariantChange} />);

    await user.click(screen.getByRole('button', { name: /collapse sidebar/i }));

    expect(handleVariantChange).toHaveBeenCalledWith('collapsed');
  });

  it('renders bottom navigation for mobile mode', () => {
    renderSidebar(<Sidebar mobileMode="bottomNav" />);

    expect(screen.getByLabelText(/mobile navigation/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(4);
    // Applications remains an inert button until its route ships.
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
