import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { ElementType } from 'react';

import { Button } from '@/components/atoms/Button';




import { borderRadius, colorTokens, fontSize, fontWeight, spacing } from '@/tokens';

export const ResumeScoreRoot = styled(Box)({
  '&::before': {
    animation: 'resume-card-shift 5s ease-in-out infinite alternate',
    background:
      'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.26), transparent 9rem), radial-gradient(circle at 88% 72%, rgba(24,104,219,0.3), transparent 10rem)',
    content: '""',
    inset: 0,
    position: 'absolute',
  },
  '& > *': {
    position: 'relative',
    zIndex: 1,
  },
  '@keyframes resume-card-shift': {
    '0%': {
      transform: 'translate3d(-0.5rem, -0.25rem, 0) scale(1)',
    },
    '100%': {
      transform: 'translate3d(0.5rem, 0.35rem, 0) scale(1.04)',
    },
  },
  '@media (max-width: 36rem)': {
    padding: spacing[4],
  },
  background: colorTokens.actionPrimaryGradient,
  borderRadius: borderRadius.xl,
  color: colorTokens.textInverse,
  minHeight: '13rem',
  overflow: 'hidden',
  padding: spacing[5],
  position: 'relative',
});

export const ResumeScoreHeader = styled(Box)({
  alignItems: 'center',
  display: 'flex',
  justifyContent: 'space-between',
  position: 'relative',
  zIndex: 1,

  '@media (max-width: 36rem)': {
    alignItems: 'flex-start',
    gap: spacing[3],
  },
});

export const ResumeScoreTitle = styled(Typography)<{ component?: ElementType }>({
  fontSize: fontSize.lg,
  fontWeight: fontWeight.bold,
});

export const AiBadge = styled(Box)({
  alignItems: 'center',
  border: '0.0625rem solid rgba(255,255,255,0.32)',
  borderRadius: borderRadius.lg,
  display: 'flex',
  fontSize: fontSize.sm,
  gap: spacing[1],
  padding: `${spacing[2]} ${spacing[3]}`,
});

export const ResumeScoreContent = styled(Box)({
  alignItems: 'center',
  display: 'grid',
  gap: spacing[6],
  gridTemplateColumns: '8.75rem 1fr',
  marginTop: spacing[4],

  '@media (max-width: 720px)': {
    gridTemplateColumns: '1fr',
    justifyItems: 'start',
  },
});

export const ScoreRing = styled(Box)({
  '&::before': {
    background: colorTokens.actionPrimaryGradient,
    borderRadius: borderRadius.full,
    content: '""',
    gridArea: '1 / 1',
    height: '100%',
    width: '100%',
  },
  '& > *': {
    gridArea: '1 / 1',
    position: 'relative',
  },
  '& small': {
    alignSelf: 'end',
    fontSize: fontSize.sm,
    marginBottom: spacing[6],
  },
  '& span': {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.extraBold,
    lineHeight: 1,
  },
  '@keyframes resume-score-fill': {
    '0%': {
      background: 'conic-gradient(#ffffff 0 0%, rgba(255,255,255,0.28) 0% 100%)',
      transform: 'scale(0.96)',
    },
    '100%': {
      background:
        'conic-gradient(#ffffff 0 var(--score), rgba(255,255,255,0.28) var(--score) 100%)',
      transform: 'scale(1)',
    },
  },
  alignItems: 'center',
  animation: 'resume-score-fill 900ms ease-out both',
  aspectRatio: '1',
  background: 'conic-gradient(#ffffff 0 var(--score), rgba(255,255,255,0.28) var(--score) 100%)',
  borderRadius: borderRadius.full,
  color: colorTokens.textInverse,
  display: 'grid',
  justifyItems: 'center',
  padding: spacing[3],
  placeSelf: 'center',
  position: 'relative',
  width: '8.5rem',
});

export const ResumeScoreCopy = styled(Box)({
  alignContent: 'center',
  display: 'grid',
  gap: spacing[3],
  justifyItems: 'start',

  '@media (max-width: 720px)': {
    justifyItems: 'center',
    textAlign: 'center',
    width: '100%',
  },
});

export const ResumeScoreMessage = styled(Typography)({
  color: colorTokens.textInverse,
  fontFamily: 'Caveat, cursive',
  fontSize: fontSize.xl,
  fontWeight: fontWeight.semiBold,
  lineHeight: 1.25,
  maxWidth: '19rem',

  '@media (max-width: 720px)': {
    maxWidth: '24rem',
  },
});

export const ResumeScoreGrowth = styled(Typography)({
  color: '#dcfce7',
  fontSize: fontSize.base,
});

export const ResumeScoreAction = styled(Button)({
  background: colorTokens.backgroundCard,
  color: colorTokens.actionPrimary,
  minWidth: '11.5rem',

  '&:hover': {
    background: colorTokens.backgroundCard,
    boxShadow: '0 0.875rem 1.75rem rgba(31, 41, 55, 0.18)',
    transform: 'translateY(-0.0625rem)',
  },
});
