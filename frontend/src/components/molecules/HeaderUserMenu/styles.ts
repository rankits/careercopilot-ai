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
  gap: spacing[3],
  gridTemplateColumns: 'auto minmax(0, auto) auto',
  padding: 0,
  textAlign: 'left',

  '@media (max-width: 42rem)': {
    gap: spacing[1],
  },
});

export const UserAvatar = styled(Avatar)({
  background: colorTokens.actionPrimaryActive,
  color: colorTokens.textInverse,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.extraBold,
  height: spacing[10],
  width: spacing[10],

  '@media (max-width: 42rem)': {
    height: spacing[10],
    width: spacing[10],
  },
});

export const UserMenuText = styled(Box)({
  display: 'grid',
  gap: spacing[1],
  minWidth: 0,

  '& span': {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
  },

  '& small': {
    color: colorTokens.actionPrimaryActive,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
  },
});

export const menuItemSx: SxProps<Theme> = {
  display: 'flex',
  gap: spacing[3],
  minWidth: '10rem',
};
