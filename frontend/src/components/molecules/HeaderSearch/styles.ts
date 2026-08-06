import type { SxProps, Theme } from '@/lib/material';
import { borderRadius, colorTokens, spacing } from '@/tokens';

export const headerSearchSx: SxProps<Theme> = {
  maxWidth: '100%',
  minWidth: 0,
  width: '100%',
  '& .MuiOutlinedInput-root': {
    background: colorTokens.backgroundCard,
    borderRadius: borderRadius.full,
    maxWidth: '100%',
    minHeight: spacing[12],
    minWidth: 0,
    width: '100%',
  },
};
