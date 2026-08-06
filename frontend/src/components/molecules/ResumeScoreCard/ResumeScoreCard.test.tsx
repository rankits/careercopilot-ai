import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RESUME_SCORE_ANIMATION, RESUME_SCORE_COPY } from '@/constants/ui';

import { ResumeScoreCard } from './ResumeScoreCard';

describe('ResumeScoreCard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders static copy and header elements correctly', () => {
    render(<ResumeScoreCard score={85} />);

    expect(screen.getByRole('heading', { level: 2, name: RESUME_SCORE_COPY.title })).toBeInTheDocument();
    expect(screen.getByText(RESUME_SCORE_COPY.aiAnalysis)).toBeInTheDocument();
    expect(screen.getByText(RESUME_SCORE_COPY.excellent)).toBeInTheDocument();
    expect(screen.getByText(RESUME_SCORE_COPY.message)).toBeInTheDocument();
    expect(screen.getByText(RESUME_SCORE_COPY.growth)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: RESUME_SCORE_COPY.improveResume })).toBeInTheDocument();
  });

  it('renders score ring with proper aria-label and style variable', () => {
    const score = 88;
    render(<ResumeScoreCard score={score} />);

    const scoreRing = screen.getByLabelText(RESUME_SCORE_COPY.ariaLabel(score));
    expect(scoreRing).toBeInTheDocument();
    expect(scoreRing).toHaveStyle({ '--score': `${score}%` });
  });

  it('animates display score up to target score and stops timer', () => {
    const score = 80;
    render(<ResumeScoreCard score={score} />);

    const scoreRing = screen.getByLabelText(RESUME_SCORE_COPY.ariaLabel(score));

    // Initially score displays 0%
    expect(scoreRing).toHaveTextContent('0%');

    // Fast-forward timer to complete animation
    act(() => {
      vi.advanceTimersByTime(RESUME_SCORE_ANIMATION.intervalMs * 30);
    });

    expect(scoreRing).toHaveTextContent(`${score}%`);
  });

  it('handles score changes by restarting the animation count up', () => {
    const { rerender } = render(<ResumeScoreCard score={50} />);

    act(() => {
      vi.runAllTimers();
    });
    const scoreRing50 = screen.getByLabelText(RESUME_SCORE_COPY.ariaLabel(50));
    expect(scoreRing50).toHaveTextContent('50%');

    // Rerender with a new score
    rerender(<ResumeScoreCard score={92} />);

    act(() => {
      vi.runAllTimers();
    });
    const scoreRing92 = screen.getByLabelText(RESUME_SCORE_COPY.ariaLabel(92));
    expect(scoreRing92).toHaveTextContent('92%');
  });
});
