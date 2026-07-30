import { useEffect, useState, type CSSProperties } from 'react';

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
    const step = Math.max(1, Math.ceil(score / 24));
    const frame = window.setInterval(() => {
      current = Math.min(score, current + step);
      setDisplayScore(current);

      if (current === score) {
        window.clearInterval(frame);
      }
    }, 28);

    return () => window.clearInterval(frame);
  }, [score]);

  return (
    <ResumeScoreRoot>
      <ResumeScoreHeader>
        <ResumeScoreTitle component="h2">Resume Score</ResumeScoreTitle>
        <AiBadge>
          <AutoAwesomeOutlinedIcon fontSize="small" /> AI Analysis
        </AiBadge>
      </ResumeScoreHeader>
      <ResumeScoreContent>
        <ScoreRing
          aria-label={`Resume score ${score} percent`}
          style={{ '--score': `${score}%` } as CSSProperties}
        >
          <span>{displayScore}%</span>
          <small>Excellent</small>
        </ScoreRing>
        <ResumeScoreCopy>
          <ResumeScoreMessage>Great job! Your resume is performing really well.</ResumeScoreMessage>
          <ResumeScoreGrowth>up 4% from last scan</ResumeScoreGrowth>
          <ResumeScoreAction endIcon={<ArrowForwardIcon />} size="small" variant="ghost">
            Improve Resume
          </ResumeScoreAction>
        </ResumeScoreCopy>
      </ResumeScoreContent>
    </ResumeScoreRoot>
  );
}
