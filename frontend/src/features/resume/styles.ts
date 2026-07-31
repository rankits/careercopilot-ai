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
  padding: `${spacing[6]} ${spacing[4]} ${spacing[28]}`,
  width: '100%',
  [theme.breakpoints.up('md')]: {
    padding: `${spacing[8]} ${spacing[6]} ${spacing[28]}`,
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
  alignItems: 'center',
  backdropFilter: 'blur(16px)',
  background: colorTokens.backgroundCardTranslucent,
  border: `${borderWidth.thin} solid ${colorTokens.borderSubtle}`,
  borderRadius: borderRadius.xl,
  bottom: spacing[4],
  boxShadow: shadows.card,
  display: 'flex',
  flexDirection: 'column',
  gap: spacing[3],
  left: spacing[4],
  padding: spacing[3],
  position: 'fixed',
  right: spacing[4],
  zIndex: theme.zIndex.appBar,
  [theme.breakpoints.up('sm')]: {
    flexDirection: 'row',
    left: spacing[6],
    margin: '0 auto',
    maxWidth: '87rem',
    right: spacing[6],
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
