import type { SxProps, Theme } from '@/lib/material';
import { colorTokens, spacing } from '@/tokens';

export const notificationButtonSx: SxProps<Theme> = {
  color: colorTokens.actionPrimaryActive,
  height: spacing[12],
  width: spacing[12],
};
