import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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
  skills: ['React', 'TypeScript'],
  tags: ['remote'],
  title: 'Frontend Engineer',
  type: 'Remote',
};

describe('DashboardJobRow', () => {
  it('does not fabricate a 97% match on featured rows without a score', () => {
    render(<DashboardJobRow featured job={baseJob} />);

    expect(screen.queryByText(/97% Match/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/% Match/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /apply now/i })).not.toBeInTheDocument();
  });

  it('shows the provided match score when present', () => {
    render(<DashboardJobRow featured job={{ ...baseJob, match: 81 }} />);

    expect(screen.getByText(/81% Match/i)).toBeInTheDocument();
  });
});
