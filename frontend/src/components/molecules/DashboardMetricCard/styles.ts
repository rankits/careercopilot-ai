import { Box, Typography, styled } from '@/lib/material';
import { borderRadius, colorTokens, fontSize, fontWeight, shadows, spacing } from '@/tokens';

export const MetricCardRoot = styled(Box)({
  alignItems: 'center',
  background: colorTokens.backgroundCard,
  border: `0.0625rem solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.xl,
  boxShadow: shadows.card,
  display: 'flex',
  gap: spacing[4],
  minHeight: '6rem',
  padding: spacing[4],
});

export const MetricIcon = styled(Box)({
  alignItems: 'center',
  background: colorTokens.actionPrimarySubtle,
  borderRadius: borderRadius.full,
  color: colorTokens.actionPrimary,
  display: 'grid',
  height: '3.25rem',
  justifyItems: 'center',
  width: '3.25rem',
});

export const MetricValue = styled(Typography)({
  color: colorTokens.textPrimary,
  fontSize: fontSize['2xl'],
  fontWeight: fontWeight.extraBold,
  lineHeight: 1.1,
});

export const MetricLabel = styled(Typography)({
  color: colorTokens.textPrimary,
  fontSize: fontSize.base,
});

export const MetricHelper = styled(Typography)({
  color: colorTokens.feedbackSuccess,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  marginTop: spacing[2],
});
