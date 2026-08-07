import type { SxProps, Theme } from '@mui/material/styles';

import { colorTokens, spacing } from '@/tokens';

export const notificationButtonSx: SxProps<Theme> = {
  color: colorTokens.actionPrimary,
  height: spacing[12],
  width: spacing[12],
};
