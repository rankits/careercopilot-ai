import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JOB_FILTER_BAR_COPY } from '@/constants/ui';
import * as material from '@/lib/material';

import type { JobFilter } from './JobFilterBar';
import { JobFilterBar } from './JobFilterBar';

vi.mock('@/lib/material', async () => {
  const actual = await vi.importActual<typeof material>('@/lib/material');
  return {
    ...actual,
    useMediaQuery: vi.fn(),
  };
});

const mockFilters: JobFilter[] = [
  { active: true, icon: 'ai', id: 'ai-match', label: 'AI Match' },
  { active: false, id: 'remote', label: 'Remote Only' },
  { active: false, id: 'location', label: 'Location', menu: true },
];

describe('JobFilterBar', () => {
  beforeEach(() => {
    vi.mocked(material.useMediaQuery).mockReturnValue(false);
  });

  it('renders all filter buttons with correct labels and aria-pressed attributes', () => {
    render(<JobFilterBar filters={mockFilters} />);

    const aiButton = screen.getByRole('button', { name: /ai match/i });
    const remoteButton = screen.getByRole('button', { name: /remote only/i });
    const locationButton = screen.getByRole('button', { name: /location/i });

    expect(aiButton).toBeInTheDocument();
    expect(aiButton).toHaveAttribute('aria-pressed', 'true');

    expect(remoteButton).toBeInTheDocument();
    expect(remoteButton).toHaveAttribute('aria-pressed', 'false');

    expect(locationButton).toBeInTheDocument();
    expect(locationButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onFilterClick when a filter button is clicked', async () => {
    const user = userEvent.setup();
    const handleFilterClick = vi.fn();

    render(<JobFilterBar filters={mockFilters} onFilterClick={handleFilterClick} />);

    const remoteButton = screen.getByRole('button', { name: /remote only/i });
    await user.click(remoteButton);

    expect(handleFilterClick).toHaveBeenCalledTimes(1);
    expect(handleFilterClick).toHaveBeenCalledWith(mockFilters[1]);
  });

  it('handles filter click safely when onFilterClick is undefined', async () => {
    const user = userEvent.setup();

    render(<JobFilterBar filters={mockFilters} />);

    const aiButton = screen.getByRole('button', { name: /ai match/i });
    await expect(user.click(aiButton)).resolves.not.toThrow();
  });

  it('does not render scroll buttons when not in compact mode', () => {
    vi.mocked(material.useMediaQuery).mockReturnValue(false);

    render(<JobFilterBar filters={mockFilters} />);

    expect(screen.queryByLabelText(JOB_FILTER_BAR_COPY.scrollLeftAria)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(JOB_FILTER_BAR_COPY.scrollRightAria)).not.toBeInTheDocument();
  });

  it('renders scroll buttons in compact mode', () => {
    vi.mocked(material.useMediaQuery).mockReturnValue(true);

    render(<JobFilterBar filters={mockFilters} />);

    const leftScrollButton = screen.getByLabelText(JOB_FILTER_BAR_COPY.scrollLeftAria);
    const rightScrollButton = screen.getByLabelText(JOB_FILTER_BAR_COPY.scrollRightAria);

    expect(leftScrollButton).toBeInTheDocument();
    expect(rightScrollButton).toBeInTheDocument();
  });

  it('scrolls the track when scroll buttons are clicked in compact mode', async () => {
    vi.mocked(material.useMediaQuery).mockReturnValue(true);

    render(<JobFilterBar filters={mockFilters} />);

    const track = screen.getByLabelText(JOB_FILTER_BAR_COPY.trackAria);
    const scrollBySpy = vi.fn();
    track.scrollBy = scrollBySpy;

    // Simulate elements scrollability
    Object.defineProperty(track, 'scrollWidth', { configurable: true, value: 1000 });
    Object.defineProperty(track, 'clientWidth', { configurable: true, value: 200 });
    Object.defineProperty(track, 'scrollLeft', { configurable: true, value: 100 });

    // Trigger scroll event to update scrollState
    act(() => {
      fireEvent.scroll(track);
    });

    const leftScrollButton = screen.getByLabelText(JOB_FILTER_BAR_COPY.scrollLeftAria);
    const rightScrollButton = screen.getByLabelText(JOB_FILTER_BAR_COPY.scrollRightAria);

    await waitFor(() => {
      expect(leftScrollButton).not.toBeDisabled();
      expect(rightScrollButton).not.toBeDisabled();
    });

    const user = userEvent.setup();
    await user.click(rightScrollButton);
    expect(scrollBySpy).toHaveBeenCalledWith({ behavior: 'smooth', left: expect.any(Number) });

    await user.click(leftScrollButton);
    expect(scrollBySpy).toHaveBeenCalledWith({ behavior: 'smooth', left: expect.any(Number) });
  });

  it('disables scroll buttons when track cannot be scrolled', () => {
    vi.mocked(material.useMediaQuery).mockReturnValue(true);

    render(<JobFilterBar filters={mockFilters} />);

    const track = screen.getByLabelText(JOB_FILTER_BAR_COPY.trackAria);

    Object.defineProperty(track, 'scrollWidth', { configurable: true, value: 200 });
    Object.defineProperty(track, 'clientWidth', { configurable: true, value: 200 });
    Object.defineProperty(track, 'scrollLeft', { configurable: true, value: 0 });

    act(() => {
      fireEvent.scroll(track);
    });

    const leftScrollButton = screen.getByLabelText(JOB_FILTER_BAR_COPY.scrollLeftAria);
    const rightScrollButton = screen.getByLabelText(JOB_FILTER_BAR_COPY.scrollRightAria);

    expect(leftScrollButton).toBeDisabled();
    expect(rightScrollButton).toBeDisabled();
  });
});
