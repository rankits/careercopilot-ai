import { Box, styled, type SxProps, type Theme } from '@/lib/material';
import { borderRadius, borderWidth, colorTokens, shadows, spacing } from '@/tokens';

export const OnboardingViewport = styled(Box)({
  background: colorTokens.backgroundApp,
  boxSizing: 'border-box',
  height: '100dvh',
  overflowX: 'hidden',
  overflowY: 'auto',
  width: '100%',
});

export const OnboardingPage = styled('main')(({ theme }) => ({
  boxSizing: 'border-box',
  display: 'grid',
  gap: spacing[5],
  margin: '0 auto',
  maxWidth: '91rem',
  minWidth: 0,
  padding: `${spacing[6]} ${spacing[4]} ${spacing[8]}`,
  width: '100%',
  [theme.breakpoints.down('sm')]: {
    gap: spacing[4],
    padding: `${spacing[4]} ${spacing[3]} ${spacing[6]}`,
  },
  [theme.breakpoints.up('md')]: {
    padding: `${spacing[8]} ${spacing[6]} ${spacing[8]}`,
  },
}));

export const OnboardingPageHeader = styled(Box)(({ theme }) => ({
  alignItems: 'flex-start',
  display: 'grid',
  gap: spacing[4],
  minWidth: 0,
  '& h1': {
    overflowWrap: 'anywhere',
  },
  [theme.breakpoints.down('sm')]: {
    gap: spacing[3],
    '& h1': {
      fontSize: '1.5rem',
      lineHeight: 1.25,
    },
  },
  [theme.breakpoints.up('md')]: {
    alignItems: 'center',
    gridTemplateColumns: 'minmax(0, 1fr) 16rem',
  },
}));

export const ProfileReviewColumn = styled(Box)({
  display: 'grid',
  gap: spacing[4],
  minWidth: 0,
  width: '100%',
});

export const ProfileStickyActions = styled(Box)(({ theme }) => ({
  alignItems: 'stretch',
  backdropFilter: 'blur(16px)',
  background: colorTokens.backgroundCardTranslucent,
  border: `${borderWidth.thin} solid ${colorTokens.borderSubtle}`,
  borderRadius: borderRadius.xl,
  bottom: spacing[4],
  boxShadow: shadows.card,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: spacing[3],
  justifyContent: 'flex-end',
  marginTop: spacing[4],
  maxWidth: '100%',
  minWidth: 0,
  padding: spacing[3],
  position: 'sticky',
  width: '100%',
  zIndex: theme.zIndex.appBar,
  '& > .MuiButton-root': {
    alignSelf: 'stretch',
    width: '100%',
  },
  [theme.breakpoints.up('sm')]: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    '& > .MuiButton-root': {
      alignSelf: 'auto',
      flexShrink: 0,
      width: 'auto',
    },
  },
}));

export const resumePrimaryActionSx = {
  '&.Mui-disabled': {
    background: colorTokens.actionPrimaryGradient,
    color: colorTokens.textInverse,
    cursor: 'not-allowed',
    opacity: 0.55,
    pointerEvents: 'auto',
  },
  color: colorTokens.textInverse,
} satisfies SxProps<Theme>;
