import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';

import { colorTokens, shadows, spacing } from '@/tokens';

export const HeaderRoot = styled('header')({
  alignItems: 'center',
  background: colorTokens.backgroundCard,
  borderBottom: `0.0625rem solid ${colorTokens.borderDefault}`,
  boxShadow: shadows.card,
  containerType: 'inline-size',
  display: 'flex',
  gap: spacing[4],
  height: '4.5rem',
  minWidth: 0,
  overflow: 'hidden',
  padding: `${spacing[2]} ${spacing[8]}`,
  width: '100%',

  '@media (max-width: 42rem)': {
    gap: spacing[2],
    padding: `${spacing[2]} ${spacing[4]}`,
  },

  /* Content area can be narrow while the viewport is still "desktop" (open sidebar). */
  '@container (max-width: 48rem)': {
    gap: spacing[2],
    paddingInline: spacing[3],

    '& .header-user-meta, & .header-user-chevron': {
      display: 'none',
    },
  },
});

export const MobileLogoLink = styled(RouterLink)({
  display: 'none',
  flex: '0 0 auto',
  height: spacing[10],
  lineHeight: 0,
  textDecoration: 'none',
  width: spacing[10],

  '& img': {
    display: 'block',
    height: '100%',
    objectFit: 'contain',
    width: '100%',
  },

  '@media (max-width: 47.5rem)': {
    display: 'block',
  },
});

export const SearchWrap = styled(Box)({
  flex: '1 1 auto',
  maxWidth: '32rem',
  minWidth: 0,
});

export const HeaderActions = styled(Box)({
  alignItems: 'center',
  display: 'flex',
  flex: '0 0 auto',
  gap: spacing[4],
  justifyContent: 'flex-end',
  marginLeft: 'auto',
  minWidth: 0,

  '@media (max-width: 56rem)': {
    gap: spacing[2],

    '& .header-user-meta, & .header-user-chevron': {
      display: 'none',
    },
  },

  '@media (max-width: 42rem)': {
    gap: spacing[1],
  },
});
