import type { SxProps, Theme } from '@mui/material/styles';

import { borderRadius, colorTokens, fontSize, fontWeight, spacing } from '@/tokens';

export const socialConnectButtonSx: SxProps<Theme> = {
  '&:hover': {
    bgcolor: colorTokens.actionPrimarySurface,
    borderColor: colorTokens.borderHover,
  },
  alignItems: 'center',
  bgcolor: colorTokens.backgroundCard,
  border: `0.0625rem solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.xl,
  color: colorTokens.textPrimary,
  display: 'grid',
  fontSize: fontSize.base,
  fontWeight: fontWeight.bold,
  gap: spacing[4],
  gridTemplateColumns: '1.75rem 1fr',
  minHeight: spacing[14],
  px: spacing[6],
  textAlign: 'left',
  textTransform: 'none',
};
