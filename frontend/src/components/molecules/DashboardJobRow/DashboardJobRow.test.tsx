import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { JobCardData } from '../JobCard';

import { DashboardJobRow } from './DashboardJobRow';

const baseJob: JobCardData = {
  accent: 'primary',
  company: 'Acme',
  experience: '3+ yrs',
  experienceBand: '3-4',
  location: 'Remote',
  logo: 'A',
  postedAt: 'Posted 1d ago',
  salary: 'Rs 10 - 20 LPA',
  salaryBand: '15-25',
  skills: ['React', 'TypeScript', 'Next.js', 'Node', 'GraphQL', 'Tailwind'],
  tags: ['remote'],
  title: 'Frontend Engineer',
  type: 'Remote',
};

const featuredJob: JobCardData = { ...baseJob, match: 81 };

describe('DashboardJobRow', () => {
  it('renders a featured row with a match badge when a score is present', () => {
    render(<DashboardJobRow featured job={featuredJob} />);

    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByText('81% Match')).toBeInTheDocument();
    expect(screen.getByText('Rs 10 - 20 LPA')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Remote')).toBeInTheDocument();
  });

  it('renders a featured row without a match badge when no score is present', () => {
    render(<DashboardJobRow featured job={baseJob} />);

    expect(screen.queryByText(/% Match/i)).not.toBeInTheDocument();
  });

  it('shows save and apply actions on a featured row and fires callbacks', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onApply = vi.fn();

    render(<DashboardJobRow featured job={featuredJob} onSave={onSave} onApply={onApply} />);

    const saveButton = screen.getByRole('button', { name: 'Save Frontend Engineer' });
    const applyButton = screen.getByRole('button', { name: 'Apply Now' });

    await user.click(saveButton);
    await user.click(applyButton);

    expect(onSave).toHaveBeenCalledWith(featuredJob);
    expect(onApply).toHaveBeenCalledWith(featuredJob);
  });

  it('renders only the primary skills (up to 5) on a featured row', () => {
    render(<DashboardJobRow featured job={featuredJob} />);

    const chips = screen.getAllByText(/React|TypeScript|Next\.js|Node|GraphQL|Tailwind/);

    expect(chips.filter((chip) => chip.tagName === 'SPAN')).toHaveLength(5);
    expect(screen.queryByText('Tailwind')).not.toBeInTheDocument();
  });

  it('renders a regular row with all job details and up to 4 skills', () => {
    render(<DashboardJobRow job={baseJob} />);

    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText(/1d ago/)).toBeInTheDocument();
    expect(screen.getAllByText('Remote')).toHaveLength(2);
    expect(screen.getByText('Rs 10 - 20 LPA')).toBeInTheDocument();
    expect(screen.queryByText(/% Match/i)).not.toBeInTheDocument();

    const chips = screen.getAllByText(/React|TypeScript|Next\.js|Node|GraphQL|Tailwind/);
    expect(chips.filter((chip) => chip.tagName === 'SPAN')).toHaveLength(4);
    expect(screen.queryByText('GraphQL')).not.toBeInTheDocument();
    expect(screen.queryByText('Tailwind')).not.toBeInTheDocument();
  });

  it('renders a regular row with a match badge when a score is present', () => {
    render(<DashboardJobRow job={featuredJob} />);

    expect(screen.getByText('81% Match')).toBeInTheDocument();
  });

  it('shows save and apply actions on a regular row and fires callbacks', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onApply = vi.fn();

    render(<DashboardJobRow job={featuredJob} onSave={onSave} onApply={onApply} />);

    const saveButton = screen.getByRole('button', { name: 'Save Frontend Engineer' });
    const applyButton = screen.getByRole('button', { name: 'Apply Now' });

    await user.click(saveButton);
    await user.click(applyButton);

    expect(onSave).toHaveBeenCalledWith(featuredJob);
    expect(onApply).toHaveBeenCalledWith(featuredJob);
  });

  it('renders only the apply action on a featured row when only onApply is provided', () => {
    render(<DashboardJobRow featured job={featuredJob} onApply={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Apply Now' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Save Frontend Engineer' }),
    ).not.toBeInTheDocument();
  });

  it('renders only the save action on a featured row when only onSave is provided', () => {
    render(<DashboardJobRow featured job={featuredJob} onSave={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Save Frontend Engineer' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply Now' })).not.toBeInTheDocument();
  });

  it('renders only the apply action when only onApply is provided', () => {
    render(<DashboardJobRow job={featuredJob} onApply={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Apply Now' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Save Frontend Engineer' }),
    ).not.toBeInTheDocument();
  });

  it('renders only the save action when only onSave is provided', () => {
    const onSave = vi.fn();

    render(<DashboardJobRow job={featuredJob} onSave={onSave} />);

    expect(screen.getByRole('button', { name: 'Save Frontend Engineer' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply Now' })).not.toBeInTheDocument();
  });
});
