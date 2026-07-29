import { Box, styled } from '@/lib/material';
import { colorTokens, shadows, spacing } from '@/tokens';

export const HeaderRoot = styled('header')({
  alignItems: 'center',
  background: colorTokens.backgroundCard,
  borderBottom: `0.0625rem solid ${colorTokens.borderDefault}`,
  boxShadow: shadows.card,
  display: 'grid',
  gap: spacing[4],
  gridTemplateColumns: 'minmax(16rem, 30rem) 1fr',
  height: '4.5rem',
  padding: `${spacing[2]} ${spacing[8]}`,

  '@media (max-width: 42rem)': {
    gap: spacing[2],
    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
    padding: `${spacing[2]} ${spacing[3]}`,
  },
});

export const MobileLogo = styled('img')({
  display: 'none',
  height: spacing[10],
  objectFit: 'contain',
  width: spacing[10],

  '@media (max-width: 42rem)': {
    display: 'block',
  },
});

export const SearchWrap = styled(Box)({
  minWidth: 0,
});

export const HeaderActions = styled(Box)({
  alignItems: 'center',
  display: 'flex',
  gap: spacing[4],
  justifyContent: 'flex-end',
  minWidth: 0,

  '@media (max-width: 56rem)': {
    gap: spacing[2],
  },

  '@media (max-width: 42rem)': {
    gap: spacing[1],

    '& [aria-label="User menu"] > div:nth-of-type(2)': {
      display: 'none',
    },
  },
});
