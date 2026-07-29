import type { SxProps, Theme } from '@/lib/material';
import { borderRadius, colorTokens, spacing } from '@/tokens';

export const headerSearchSx: SxProps<Theme> = {
  '& .MuiOutlinedInput-root': {
    background: colorTokens.backgroundCard,
    borderRadius: borderRadius.full,
    minHeight: spacing[12],
  },
};
