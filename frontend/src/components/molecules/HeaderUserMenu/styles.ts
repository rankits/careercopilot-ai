import type { SxProps, Theme } from '@/lib/material';
import { Avatar, Box, styled } from '@/lib/material';
import { colorTokens, fontSize, fontWeight, spacing } from '@/tokens';

export const UserMenuButton = styled('button')({
  alignItems: 'center',
  background: 'transparent',
  border: 0,
  color: colorTokens.textPrimary,
  cursor: 'pointer',
  display: 'grid',
  flex: '0 0 auto',
  gap: spacing[3],
  gridTemplateColumns: 'auto minmax(0, auto) auto',
  maxWidth: '100%',
  minWidth: 0,
  padding: 0,
  textAlign: 'left',

  '@media (max-width: 56rem)': {
    gap: 0,
    gridTemplateColumns: 'auto',
  },
});

export const UserAvatar = styled(Avatar)({
  background: colorTokens.actionPrimaryGradient,
  color: colorTokens.textInverse,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.extraBold,
  height: spacing[10],
  width: spacing[10],
});

export const UserMenuText = styled(Box)({
  display: 'grid',
  gap: spacing[1],
  minWidth: 0,
  overflow: 'hidden',

  '& span, & small': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  '& span': {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
    lineHeight: 1.2,
    maxWidth: '9rem',
  },

  '& small': {
    color: colorTokens.actionPrimary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    lineHeight: 1.2,
    maxWidth: '9rem',
  },
});

export const menuItemSx: SxProps<Theme> = {
  display: 'flex',
  gap: spacing[3],
  minWidth: '10rem',
};
