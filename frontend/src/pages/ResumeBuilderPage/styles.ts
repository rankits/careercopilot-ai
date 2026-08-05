import { Box, styled } from '@/lib/material';
import { colorTokens } from '@/tokens';

import { borderRadius, spacing } from './styles/shared';

export const Root = styled(Box)({
  borderRadius: borderRadius['2xl'],
  boxSizing: 'border-box',
  display: 'grid',
  gap: spacing[3],
  marginInline: 'auto',
  maxWidth: 'min(100%, 100rem)',
  minHeight: 0,
  minWidth: 0,
  overflowX: 'clip',
  overflowY: 'visible',
  padding: `${spacing[4]} ${spacing[3]}`,
  width: '100%',
  '@media (max-width: 48rem)': {
    gap: spacing[2],
    padding: `${spacing[3]} ${spacing[2]}`,
  },
  // Extreme browser zoom (e.g. 33%): keep layout fluid and prevent overflow breakage.
  '@media (min-width: 120rem)': {
    gap: spacing[4],
    padding: `${spacing[4]} ${spacing[5]}`,
  },
  '& > *': {
    minWidth: 0,
    maxWidth: '100%',
  },
});

/** Header + stepper chrome (scrolls with the page). */
export const StickyChrome = styled(Box)({
  background: colorTokens.backgroundCard,
  borderRadius: borderRadius['2xl'],
  boxSizing: 'border-box',
  maxWidth: '100%',
  minWidth: 0,
  overflow: 'hidden',
  width: '100%',
});
