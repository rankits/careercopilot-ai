import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_SIDEBAR_ITEMS } from '@/constants/ui';
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
    expect(screen.getByRole('link', { name: /ai match/i })).toHaveAttribute('href', '/ai-match');
    expect(screen.queryByRole('button', { name: /^ai match$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /applications/i })).toHaveAttribute(
      'href',
      '/applications',
    );
    expect(screen.getByRole('link', { name: /^Application Setup$/i })).toHaveAttribute(
      'href',
      '/auto-apply',
    );
    expect(screen.queryByRole('link', { name: /^Auto Apply$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^profile$/i })).toHaveAttribute(
      'href',
      '/profile/edit',
    );
    expect(screen.getByRole('button', { name: /download latest/i })).toBeInTheDocument();
    expect(screen.getByText(/no resume uploaded yet/i)).toBeInTheDocument();
  });

  it('shows the latest resume download action when a resume is available', async () => {
    const user = userEvent.setup();
    const handleDownload = vi.fn();

    renderSidebar(
      <Sidebar
        latestResumeName="sonal-resume.pdf"
        onDownloadLatestResume={handleDownload}
        onOpenResumeVersions={vi.fn()}
      />,
    );

    expect(screen.getByText(/latest resume/i)).toBeInTheDocument();
    expect(screen.getByText(/download your most recent uploaded resume/i)).toBeInTheDocument();
    expect(screen.queryByText('sonal-resume.pdf')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view all versions/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /download latest/i }));
    expect(handleDownload).toHaveBeenCalledTimes(1);
  });

  it('collapses labels for icon-only mode and exposes names via aria-label', () => {
    renderSidebar(<Sidebar variant="collapsed" latestResumeName="sonal-resume.pdf" />);

    expect(screen.getByRole('img', { name: /career copilot/i })).toHaveAttribute(
      'src',
      expect.stringContaining('penguin'),
    );
    expect(screen.getByRole('link', { name: /^dashboard$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^jobs feed$/i })).toBeInTheDocument();
    expect(screen.queryByText(/upload resume/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/latest resume/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^applications$/i })).toBeInTheDocument();
  });

  it('does not render the duplicate non-linking Applications item', () => {
    renderSidebar(<Sidebar />);

    const applicationLinks = screen.getAllByRole('link', { name: /^applications$/i });
    expect(applicationLinks).toHaveLength(1);
    expect(applicationLinks[0]).toHaveAttribute('href', '/applications');
    expect(screen.queryByRole('button', { name: /^applications$/i })).not.toBeInTheDocument();
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
    expect(screen.getAllByRole('link')).toHaveLength(5);
    expect(screen.getByRole('link', { name: /^profile$/i })).toHaveAttribute(
      'href',
      '/profile/edit',
    );
  });
});
