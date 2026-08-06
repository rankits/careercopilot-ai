import { useEffect, useState, type CSSProperties } from 'react';

import { RESUME_SCORE_ANIMATION, RESUME_SCORE_COPY } from '@/constants/ui';
import { ArrowForwardIcon, AutoAwesomeOutlinedIcon } from '@/lib/material';

import {
  AiBadge,
  ResumeScoreAction,
  ResumeScoreContent,
  ResumeScoreCopy,
  ResumeScoreGrowth,
  ResumeScoreHeader,
  ResumeScoreMessage,
  ResumeScoreRoot,
  ResumeScoreTitle,
  ScoreRing,
} from './styles';

export interface ResumeScoreCardProps {
  score: number;
}

export function ResumeScoreCard({ score }: ResumeScoreCardProps) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let current = 0;
    const step = Math.max(1, Math.ceil(score / RESUME_SCORE_ANIMATION.frames));
    const frame = window.setInterval(() => {
      current = Math.min(score, current + step);
      setDisplayScore(current);

      if (current === score) {
        window.clearInterval(frame);
      }
    }, RESUME_SCORE_ANIMATION.intervalMs);

    return () => window.clearInterval(frame);
  }, [score]);

  return (
    <ResumeScoreRoot>
      <ResumeScoreHeader>
        <ResumeScoreTitle component="h2">{RESUME_SCORE_COPY.title}</ResumeScoreTitle>
        <AiBadge>
          <AutoAwesomeOutlinedIcon fontSize="small" /> {RESUME_SCORE_COPY.aiAnalysis}
        </AiBadge>
      </ResumeScoreHeader>
      <ResumeScoreContent>
        <ScoreRing
          aria-label={RESUME_SCORE_COPY.ariaLabel(score)}
          style={{ '--score': `${score}%` } as CSSProperties}
        >
          <span>{displayScore}%</span>
          <small>{RESUME_SCORE_COPY.excellent}</small>
        </ScoreRing>
        <ResumeScoreCopy>
          <ResumeScoreMessage>{RESUME_SCORE_COPY.message}</ResumeScoreMessage>
          <ResumeScoreGrowth>{RESUME_SCORE_COPY.growth}</ResumeScoreGrowth>
          <ResumeScoreAction endIcon={<ArrowForwardIcon />} size="small" variant="ghost">
            {RESUME_SCORE_COPY.improveResume}
          </ResumeScoreAction>
        </ResumeScoreCopy>
      </ResumeScoreContent>
    </ResumeScoreRoot>
  );
}
