import type { SxProps, Theme } from '@/lib/material';
import { borderRadius, colorTokens, spacing } from '@/tokens';

export const headerSearchSx: SxProps<Theme> = {
  '& .MuiOutlinedInput-root': {
    background: colorTokens.backgroundCard,
    borderRadius: borderRadius.full,
    minHeight: spacing[12],
    flex: 1,
    minWidth: 0,
    maxWidth: {
      xs: '100%',
      sm: '18rem',
      md: '24rem',
      lg: '32rem',
    },
    '& .MuiOutlinedInput-root': {
      background: colorTokens.backgroundCard,
      borderRadius: borderRadius.full,
      minHeight: spacing[12],
    },
  },
};
