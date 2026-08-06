import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { JOB_CARD_COPY } from '@/constants/ui';

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

  it('shows company initial avatar and hides empty skills', () => {
    render(
      <JobCard
        job={{
          ...baseJob,
          logo: 'A',
          salary: 'Not disclosed',
          skills: [],
        }}
      />,
    );

    expect(screen.getByLabelText(/acme logo/i)).toHaveTextContent('A');
    expect(screen.queryByText('React')).not.toBeInTheDocument();
    expect(screen.getByText(/not disclosed/i)).toBeInTheDocument();
  });

  it('hides experience placeholders and only shows verified badge when verified', () => {
    const { rerender } = render(
      <JobCard
        job={{
          ...baseJob,
          experience: '',
          location: '',
          verified: false,
        }}
      />,
    );

    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.queryByText(/experience not listed/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/verified company/i)).not.toBeInTheDocument();

    rerender(
      <JobCard
        job={{
          ...baseJob,
          experience: '',
          location: 'Berlin',
          verified: true,
        }}
      />,
    );

    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Berlin')).toBeInTheDocument();
    expect(screen.getByLabelText(/verified company/i)).toBeInTheDocument();
  });

  it('disables Apply when applyUrl is missing', () => {
    render(<JobCard job={{ ...baseJob, applyUrl: null }} onApply={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: /apply to frontend engineer unavailable/i }),
    ).toBeDisabled();
  });

  it('runs recommendation feedback actions from the overflow menu', async () => {
    const user = userEvent.setup();
    const onMoreLikeThis = vi.fn();
    const onLessLikeThis = vi.fn();
    const onNotRelevant = vi.fn();
    const onDismiss = vi.fn();

    render(
      <JobCard
        job={{ ...baseJob, match: 78 }}
        onDismiss={onDismiss}
        onLessLikeThis={onLessLikeThis}
        onMoreLikeThis={onMoreLikeThis}
        onNotRelevant={onNotRelevant}
      />,
    );

    expect(screen.queryByText(JOB_CARD_COPY.moreLikeThis)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /more actions for frontend engineer/i }));

    expect(screen.getByText(JOB_CARD_COPY.moreLikeThis)).toBeInTheDocument();
    expect(screen.getByText(JOB_CARD_COPY.lessLikeThis)).toBeInTheDocument();
    expect(screen.getByText(JOB_CARD_COPY.notRelevant)).toBeInTheDocument();
    expect(screen.getByText(JOB_CARD_COPY.dismiss)).toBeInTheDocument();

    await user.click(
      screen.getByRole('menuitem', { name: /show more jobs like frontend engineer/i }),
    );

    expect(onMoreLikeThis).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Frontend Engineer' }),
    );

    await user.click(screen.getByRole('button', { name: /more actions for frontend engineer/i }));
    await user.click(
      screen.getByRole('menuitem', { name: /show fewer jobs like frontend engineer/i }),
    );

    expect(onLessLikeThis).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Frontend Engineer' }),
    );

    await user.click(screen.getByRole('button', { name: /more actions for frontend engineer/i }));
    await user.click(
      screen.getByRole('menuitem', { name: /mark frontend engineer as not relevant/i }),
    );

    expect(onNotRelevant).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Frontend Engineer' }),
    );

    await user.click(screen.getByRole('button', { name: /more actions for frontend engineer/i }));
    await user.click(
      screen.getByRole('menuitem', { name: /dismiss frontend engineer recommendation/i }),
    );

    expect(onDismiss).toHaveBeenCalledWith(expect.objectContaining({ title: 'Frontend Engineer' }));
  });

  it('opens the job details page without expanding recommendation data in the list', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const job: JobCardData = {
      ...baseJob,
      id: 'job-1',
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
    };

    render(<JobCard job={job} onOpen={onOpen} />);

    await user.click(screen.getByRole('button', { name: /more actions for frontend engineer/i }));

    await user.click(screen.getByRole('menuitem', { name: /view details for frontend engineer/i }));

    expect(onOpen).toHaveBeenCalledOnce();
    expect(onOpen).toHaveBeenCalledWith(job);
    expect(screen.queryByText(/91% match with strong skill evidence/i)).not.toBeInTheDocument();
  });
});
