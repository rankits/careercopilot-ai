import { Box, styled, type SxProps, type Theme } from '@/lib/material';
import { borderRadius, borderWidth, colorTokens, shadows, spacing } from '@/tokens';

export const OnboardingViewport = styled(Box)({
  background: colorTokens.backgroundApp,
  height: '100dvh',
  overflowX: 'hidden',
  overflowY: 'auto',
});

export const OnboardingPage = styled('main')(({ theme }) => ({
  display: 'grid',
  gap: spacing[5],
  margin: '0 auto',
  maxWidth: '91rem',
  padding: `${spacing[6]} ${spacing[4]} ${spacing[8]}`,
  width: '100%',
  [theme.breakpoints.up('md')]: {
    padding: `${spacing[8]} ${spacing[6]} ${spacing[8]}`,
  },
}));

export const OnboardingPageHeader = styled(Box)(({ theme }) => ({
  alignItems: 'flex-start',
  display: 'grid',
  gap: spacing[4],
  [theme.breakpoints.up('md')]: {
    alignItems: 'center',
    gridTemplateColumns: 'minmax(0, 1fr) 16rem',
  },
}));

export const ProfileReviewColumn = styled(Box)({
  display: 'grid',
  gap: spacing[4],
  minWidth: 0,
});

export const ProfileStickyActions = styled(Box)(({ theme }) => ({
  alignItems: 'stretch',
  backdropFilter: 'blur(16px)',
  background: colorTokens.backgroundCardTranslucent,
  border: `${borderWidth.thin} solid ${colorTokens.borderSubtle}`,
  borderRadius: borderRadius.xl,
  bottom: spacing[4],
  boxShadow: shadows.card,
  display: 'flex',
  flexDirection: 'column',
  gap: spacing[3],
  justifyContent: 'flex-end',
  marginTop: spacing[4],
  padding: spacing[3],
  position: 'sticky',
  width: '100%',
  zIndex: theme.zIndex.appBar,
  '& > .MuiButton-root': {
    alignSelf: 'flex-end',
  },
  [theme.breakpoints.up('sm')]: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    '& > .MuiButton-root': {
      alignSelf: 'auto',
      flexShrink: 0,
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
