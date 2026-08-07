import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';

import {
  borderRadius,
  colorTokens,
  fontSize,
  fontWeight,
  iconToneTokens,
  jobFeedTokens,
  shadows,
  spacing,
  type IconTone,
} from '@/tokens';

export const DashboardRoot = styled('section')({
  display: 'grid',
  gap: spacing[4],
});

export const WelcomeRoot = styled('header')({
  alignItems: 'center',
  display: 'flex',
  gap: spacing[4],
  justifyContent: 'space-between',
  minWidth: 0,
});

export const WelcomeCopy = styled('div')({
  display: 'grid',
  gap: spacing[1],
  minWidth: 0,
});

export const WelcomeHeading = styled('h1')({
  color: colorTokens.textPrimary,
  fontSize: fontSize['3xl'],
  fontWeight: fontWeight.extraBold,
  lineHeight: 1.2,
  margin: 0,

  '@media (max-width: 48rem)': {
    fontSize: fontSize['2xl'],
  },
});

export const WelcomeSubtitle = styled('p')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.base,
  margin: 0,
});

export const WelcomeMascot = styled('img')({
  flexShrink: 0,
  height: '10rem',
  maxWidth: '10rem',
  objectFit: 'contain',
  width: 'auto',

  '@media (max-width: 40rem)': {
    display: 'none',
  },
});

export const StatsGrid = styled('div')({
  display: 'grid',
  gap: spacing[3],
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',

  '@media (max-width: 72rem)': {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },

  '@media (max-width: 30rem)': {
    gridTemplateColumns: '1fr',
  },
});

export const StatCardRoot = styled('article')({
  alignItems: 'center',
  background: colorTokens.backgroundCard,
  border: `0.0625rem solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.xl,
  boxShadow: shadows.card,
  display: 'grid',
  gap: spacing[3],
  gridTemplateColumns: 'auto minmax(0, 1fr) auto',
  minWidth: 0,
  padding: `${spacing[3]} ${spacing[4]}`,
});

export const StatIcon = styled('div', {
  shouldForwardProp: (prop) => prop !== 'tone',
})<{ tone?: IconTone }>(({ tone = 'primary' }) => {
  const iconTone = iconToneTokens[tone];
  return {
    alignItems: 'center',
    background: iconTone.background,
    borderRadius: borderRadius.lg,
    color: iconTone.color,
    display: 'grid',
    flexShrink: 0,
    height: '2.75rem',
    justifyItems: 'center',
    width: '2.75rem',
  };
});

export const StatMain = styled('div')({
  display: 'grid',
  gap: '0.2rem',
  minWidth: 0,
});

export const StatValue = styled('p')({
  color: colorTokens.textPrimary,
  fontSize: fontSize['2xl'],
  fontWeight: fontWeight.extraBold,
  letterSpacing: '-0.02em',
  lineHeight: 1.1,
  margin: 0,
});

export const StatLabel = styled('p')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semiBold,
  margin: 0,
});

export const StatHelper = styled('p', {
  shouldForwardProp: (prop) => prop !== 'tone',
})<{ tone?: 'positive' | 'muted' }>(({ tone = 'muted' }) => ({
  color: tone === 'positive' ? colorTokens.feedbackSuccess : colorTokens.textTertiary,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
  margin: 0,
}));

export const StatSparklineWrap = styled('div')({
  alignSelf: 'center',
});

export const SparklineSvg = styled('svg', {
  shouldForwardProp: (prop) => prop !== 'tone',
})<{ tone?: IconTone }>({
  display: 'block',
  height: '1.75rem',
  overflow: 'visible',
  width: '4.5rem',
});

export const MidGrid = styled('div')({
  display: 'grid',
  gap: spacing[3],
  gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',

  '@media (max-width: 64rem)': {
    gridTemplateColumns: '1fr',
  },
});

export const BottomGrid = styled('div')({
  display: 'grid',
  gap: spacing[3],
  gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)',

  '@media (max-width: 64rem)': {
    gridTemplateColumns: '1fr',
  },
});

export const PanelRoot = styled('section')({
  background: colorTokens.backgroundCard,
  border: `0.0625rem solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.xl,
  boxShadow: shadows.card,
  display: 'grid',
  gap: spacing[3],
  minWidth: 0,
  padding: spacing[3],
});

export const PanelHeader = styled('div')({
  alignItems: 'center',
  display: 'flex',
  gap: spacing[2],
  justifyContent: 'space-between',
  minWidth: 0,
});

export const PanelTitle = styled('h2')({
  color: colorTokens.textPrimary,
  fontSize: fontSize.lg,
  fontWeight: fontWeight.bold,
  lineHeight: 1.2,
  margin: 0,
});

export const PanelLink = styled(RouterLink)({
  color: colorTokens.actionPrimary,
  flexShrink: 0,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.bold,
  textDecoration: 'none',
  whiteSpace: 'nowrap',

  '&:hover': {
    textDecoration: 'underline',
  },

  '&:focus-visible': {
    borderRadius: borderRadius.sm,
    outline: `0.1875rem solid ${colorTokens.actionPrimary}`,
    outlineOffset: '0.125rem',
  },
});

export const PipelineTrack = styled('div')({
  alignItems: 'start',
  display: 'grid',
  gap: spacing[2],
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  position: 'relative',

  '&::before': {
    borderTop: `0.125rem dotted ${colorTokens.borderSubtle}`,
    content: '""',
    left: '12%',
    position: 'absolute',
    right: '12%',
    top: '1.25rem',
    zIndex: 0,
  },

  '@media (max-width: 40rem)': {
    gap: spacing[3],
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',

    '&::before': {
      display: 'none',
    },
  },
});

export const PipelineStage = styled('div')({
  display: 'grid',
  gap: spacing[1],
  justifyItems: 'center',
  position: 'relative',
  textAlign: 'center',
  zIndex: 1,
});

const pipelineTone = {
  applied: iconToneTokens.primary,
  reviewed: {
    background: colorTokens.actionPrimarySubtle,
    color: colorTokens.actionPrimary,
  },
  interview: iconToneTokens.warning,
  offer: iconToneTokens.success,
} as const;

export const PipelineIcon = styled('div', {
  shouldForwardProp: (prop) => prop !== 'tone',
})<{ tone: string }>(({ tone }) => {
  const colors = pipelineTone[tone as keyof typeof pipelineTone] ?? iconToneTokens.primary;
  return {
    alignItems: 'center',
    background: colors.background,
    borderRadius: borderRadius.full,
    color: colors.color,
    display: 'grid',
    height: '2.5rem',
    justifyItems: 'center',
    width: '2.5rem',
  };
});

export const PipelineLabel = styled('span')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
});

export const PipelineCount = styled('span')({
  color: colorTokens.textPrimary,
  fontSize: fontSize['2xl'],
  fontWeight: fontWeight.extraBold,
  lineHeight: 1,
});

export const ResumeScoreBody = styled('div')({
  alignItems: 'center',
  background: colorTokens.backgroundApp,
  border: `0.0625rem solid ${colorTokens.borderSubtle}`,
  borderRadius: borderRadius.xl,
  display: 'grid',
  gap: spacing[4],
  gridTemplateColumns: 'auto minmax(0, 1fr)',
  padding: spacing[3],

  '@media (max-width: 30rem)': {
    gridTemplateColumns: '1fr',
    justifyItems: 'center',
    textAlign: 'center',
  },
});

export const ResumeScoreRing = styled('div')({
  display: 'grid',
  height: '7.5rem',
  placeItems: 'center',
  position: 'relative',
  width: '7.5rem',

  '& .MuiCircularProgress-root': {
    color: colorTokens.feedbackSuccess,
    left: 0,
    position: 'absolute',
    top: 0,
  },

  '& .dashboard-resume-track': {
    color: colorTokens.borderSubtle,
  },

  '& .MuiCircularProgress-circle': {
    strokeLinecap: 'round',
  },
});

export const ResumeScoreProgressFill = styled('div')({
  height: '7.5rem',
  left: 0,
  position: 'absolute',
  top: 0,
  width: '7.5rem',
});

export const ResumeScoreCenter = styled('div')({
  display: 'grid',
  gap: '0.15rem',
  justifyItems: 'center',
  left: '50%',
  position: 'absolute',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  zIndex: 1,
});

export const ResumeScoreValue = styled('span')({
  alignItems: 'baseline',
  color: colorTokens.textPrimary,
  display: 'inline-flex',
  fontSize: fontSize['3xl'],
  fontWeight: fontWeight.extraBold,
  letterSpacing: '-0.03em',
  lineHeight: 1,
});

export const ResumeScoreUnit = styled('span')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.bold,
  marginLeft: '0.1rem',
});

export const ResumeScoreWord = styled('span')({
  color: colorTokens.feedbackSuccess,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.bold,
});

export const ResumeScoreMeta = styled('div')({
  display: 'grid',
  gap: spacing[2],
  minWidth: 0,
  width: '100%',
});

export const ResumeSummaryText = styled('p')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  margin: 0,
});

export const ResumeChecksTitle = styled('p')({
  color: colorTokens.textTertiary,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.bold,
  letterSpacing: '0.04em',
  margin: 0,
  textTransform: 'uppercase',
});

export const ResumeCheckList = styled('ul')({
  display: 'grid',
  gap: spacing[1],
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  listStyle: 'none',
  margin: 0,
  padding: 0,
  width: '100%',

  '@media (max-width: 30rem)': {
    gridTemplateColumns: '1fr',
  },
});

export const ResumeCheckItem = styled('li', {
  shouldForwardProp: (prop) => prop !== 'complete',
})<{ complete: boolean }>(({ complete }) => ({
  alignItems: 'center',
  color: complete ? colorTokens.feedbackSuccess : colorTokens.feedbackWarning,
  display: 'flex',
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semiBold,
  gap: spacing[1],
  minWidth: 0,
  padding: `${spacing[1]} 0`,

  '& > span': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
}));

export const RecommendedGrid = styled('div')({
  display: 'grid',
  gap: spacing[3],
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',

  '@media (max-width: 56rem)': {
    gridTemplateColumns: '1fr',
  },
});

export const RecommendedJobCard = styled('article')({
  background: colorTokens.backgroundApp,
  border: `0.0625rem solid ${colorTokens.borderSubtle}`,
  borderRadius: borderRadius.lg,
  display: 'grid',
  gap: spacing[2],
  minWidth: 0,
  padding: spacing[3],
});

export const RecommendedLogo = styled('div')({
  alignItems: 'center',
  background: jobFeedTokens.companyLogoSurface,
  border: `0.0625rem solid ${colorTokens.borderSubtle}`,
  borderRadius: borderRadius.md,
  color: colorTokens.textPrimary,
  display: 'grid',
  fontSize: fontSize.lg,
  fontWeight: fontWeight.extraBold,
  height: '2.75rem',
  justifyItems: 'center',
  width: '2.75rem',
});

export const RecommendedTitle = styled('div')({
  display: 'grid',
  gap: spacing[1],
  minWidth: 0,

  '& > p': {
    color: colorTokens.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semiBold,
    margin: 0,
  },

  '& > h3': {
    color: colorTokens.textPrimary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    lineHeight: 1.25,
    margin: 0,
  },
});

export const RecommendedMeta = styled('div')({
  color: colorTokens.textSecondary,
  display: 'flex',
  flexWrap: 'wrap',
  fontSize: fontSize.xs,
  gap: `${spacing[1]} ${spacing[2]}`,

  '& span': {
    alignItems: 'center',
    display: 'inline-flex',
    gap: spacing[1],
  },
});

export const RecommendedMatch = styled('span')({
  background: jobFeedTokens.matchBackground,
  borderRadius: borderRadius.full,
  color: jobFeedTokens.matchText,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.bold,
  justifySelf: 'start',
  padding: `${spacing[1]} ${spacing[2]}`,
});

export const SavedList = styled('div')({
  display: 'grid',
  gap: spacing[2],
});

export const SavedRow = styled('button')({
  alignItems: 'center',
  background: 'transparent',
  border: `0.0625rem solid ${colorTokens.borderSubtle}`,
  borderRadius: borderRadius.lg,
  cursor: 'pointer',
  display: 'grid',
  gap: spacing[3],
  gridTemplateColumns: 'auto minmax(0, 1fr) auto',
  padding: spacing[2],
  textAlign: 'left',
  width: '100%',

  '&:hover': {
    borderColor: colorTokens.actionPrimary,
  },

  '&:focus-visible': {
    outline: `0.1875rem solid ${colorTokens.actionPrimary}`,
    outlineOffset: '0.125rem',
  },
});

export const SavedRowSkeleton = styled('div')({
  alignItems: 'center',
  border: `0.0625rem solid ${colorTokens.borderSubtle}`,
  borderRadius: borderRadius.lg,
  display: 'grid',
  gap: spacing[3],
  gridTemplateColumns: 'auto minmax(0, 1fr)',
  padding: spacing[2],
});

export const SavedLogo = styled('div')({
  alignItems: 'center',
  background: jobFeedTokens.companyLogoSurface,
  border: `0.0625rem solid ${colorTokens.borderSubtle}`,
  borderRadius: borderRadius.md,
  color: colorTokens.textPrimary,
  display: 'grid',
  fontWeight: fontWeight.extraBold,
  height: '2.5rem',
  justifyItems: 'center',
  width: '2.5rem',
});

export const SavedTitle = styled('div')({
  display: 'grid',
  gap: spacing[1],
  minWidth: 0,

  '& strong': {
    color: colorTokens.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});

export const SavedMeta = styled('span')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.xs,
});

export const EmptyText = styled('p')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.sm,
  lineHeight: 1.5,
  margin: 0,
});

export const CtaRoot = styled('section')({
  background: colorTokens.actionPrimarySurface,
  border: `0.0625rem solid ${colorTokens.borderSubtle}`,
  borderRadius: borderRadius.xl,
  padding: `${spacing[3]} ${spacing[4]}`,
});

export const CtaBody = styled('div')({
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing[3],
  justifyContent: 'space-between',
});

export const CtaCopy = styled('div')({
  display: 'grid',
  gap: spacing[1],
  minWidth: 0,
});

export const CtaTitle = styled('h2')({
  color: colorTokens.textPrimary,
  fontSize: fontSize.lg,
  fontWeight: fontWeight.bold,
  margin: 0,
});

export const CtaSubtitle = styled('p')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.sm,
  margin: 0,
});

export const DashboardError = styled(Box)({
  background: colorTokens.feedbackErrorSurface,
  border: `0.0625rem solid ${colorTokens.actionDanger}`,
  borderRadius: borderRadius.lg,
  color: colorTokens.feedbackError,
  fontSize: fontSize.sm,
  padding: spacing[3],
});
