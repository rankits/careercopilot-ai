import { styled } from '@/lib/material';
import { borderRadius, colorTokens, fontSize, fontWeight, jobFeedTokens, spacing } from '@/tokens';

export const DropdownButton = styled('button')({
  alignItems: 'center',
  background: jobFeedTokens.filterBackground,
  border: `0.0625rem solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.lg,
  color: colorTokens.textPrimary,
  cursor: 'pointer',
  display: 'inline-flex',
  fontSize: fontSize.sm,
  fontWeight: fontWeight.bold,
  gap: spacing[2],
  minHeight: spacing[10],
  paddingInline: spacing[5],
});
