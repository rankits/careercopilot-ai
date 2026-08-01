import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { JobCard, type JobCardData } from './JobCard';

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
  skills: ['React'],
  tags: ['remote'],
  title: 'Frontend Engineer',
  type: 'Remote',
};

describe('JobCard', () => {
  it('hides match badge and actions when score and handlers are absent', () => {
    render(<JobCard job={baseJob} />);

    expect(screen.queryByText(/% Match/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /apply now/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/ai recommended/i)).not.toBeInTheDocument();
  });

  it('shows match and wired actions only when provided', () => {
    const onApply = vi.fn();
    const onSave = vi.fn();

    render(
      <JobCard
        job={{ ...baseJob, isRecommended: true, match: 88 }}
        onApply={onApply}
        onSave={onSave}
      />,
    );

    expect(screen.getByText(/88% Match/i)).toBeInTheDocument();
    expect(screen.getByText(/ai recommended/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /apply now/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save frontend engineer/i })).toBeInTheDocument();
  });

  it('shows logo placeholder and hides empty skills', () => {
    render(
      <JobCard
        job={{
          ...baseJob,
          logo: 'A',
          logoUrl: undefined,
          salary: 'Not disclosed',
          skills: [],
        }}
      />,
    );

    expect(screen.getByLabelText(/acme logo/i)).toHaveTextContent('A');
    expect(screen.queryByText('React')).not.toBeInTheDocument();
    expect(screen.getByText(/not disclosed/i)).toBeInTheDocument();
  });

  it('disables Apply when applyUrl is missing', () => {
    render(<JobCard job={{ ...baseJob, applyUrl: null }} onApply={vi.fn()} />);
    expect(screen.getByRole('button', { name: /apply now/i })).toBeDisabled();
  });
});
