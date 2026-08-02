import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    expect(screen.getByRole('button', { name: /apply to frontend engineer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save frontend engineer/i })).toBeInTheDocument();
  });

  it('opens from a dedicated keyboard reachable title control', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<JobCard job={baseJob} onOpen={onOpen} />);

    const openButton = screen.getByRole('button', { name: /open frontend engineer at acme/i });
    openButton.focus();
    await user.keyboard('{Enter}');

    expect(onOpen).toHaveBeenCalledWith(baseJob);
  });

  it('shows Unsave label when isSaved', () => {
    render(<JobCard job={baseJob} isSaved onSave={vi.fn()} />);
    expect(screen.getByRole('button', { name: /unsave frontend engineer/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
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
    expect(screen.getByRole('button', { name: /apply to frontend engineer unavailable/i })).toBeDisabled();
  });

  it('expands recommendation details with reasons and skill gaps', async () => {
    const user = userEvent.setup();
    render(
      <JobCard
        job={{
          ...baseJob,
          recommendationId: 'rec-1',
          isRecommended: true,
          match: 91,
          recommendationDetails: {
            summary: '91% match with strong skill evidence',
            bullets: [
              {
                label: 'Required skills',
                score: 0.9,
                message: 'Strong required-skill overlap',
                evidence: ['React'],
              },
            ],
            skillGap: {
              exact: ['React'],
              alias: [],
              related: ['TypeScript'],
              transferable: [],
              missing: ['GraphQL'],
            },
          },
        }}
      />,
    );

    const detailsButton = screen.getByRole('button', { name: /details/i });
    expect(detailsButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(detailsButton);

    expect(detailsButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/91% match with strong skill evidence/i)).toBeInTheDocument();
    expect(screen.getByText(/required skills - 90%/i)).toBeInTheDocument();
    expect(screen.getByText(/related/i)).toBeInTheDocument();
    expect(screen.getByText(/typescript/i)).toBeInTheDocument();
    expect(screen.getByText(/missing/i)).toBeInTheDocument();
    expect(screen.getByText(/graphql/i)).toBeInTheDocument();
  });
});
