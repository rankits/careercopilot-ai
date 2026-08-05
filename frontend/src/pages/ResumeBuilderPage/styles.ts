import { Box, styled } from '@/lib/material';
import { colorTokens } from '@/tokens';

export const Root = styled(Box)({
  background: 'radial-gradient(circle at 15% 0%, rgba(37, 99, 235, 0.08), transparent 28rem), #fff',
  display: 'grid',
  marginInline: 'auto',
  maxWidth: '100rem',
  minHeight: 'calc(100vh - 4rem)',
  minWidth: 0,
  overflowX: 'hidden',
  width: '100%',
  '@media (max-width: 48rem)': {
    minHeight: 'calc(100vh - 3.5rem)',
  },
  '& > *': {
    minWidth: 0,
    maxWidth: '100%',
  },
});

/** Keeps Back / Save / Next + stepper visible while scrolling on mobile. */
export const StickyChrome = styled(Box)({
  background: colorTokens.backgroundCard,
  position: 'sticky',
  top: 0,
  zIndex: 30,
  '@media (max-width: 48rem)': {
    boxShadow: '0 1px 0 rgba(15, 23, 42, 0.08)',
    paddingTop: 'env(safe-area-inset-top, 0px)',
  },
});
