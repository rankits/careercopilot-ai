import { Box, Typography, styled } from '@/lib/material';
import {
  borderRadius,
  colorTokens,
  fontSize,
  fontWeight,
  iconToneTokens,
  shadows,
  spacing,
  type IconTone,
} from '@/tokens';

export const MetricCardRoot = styled(Box)({
  alignItems: 'center',
  background: colorTokens.backgroundCard,
  border: `0.0625rem solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.xl,
  boxShadow: shadows.card,
  display: 'flex',
  gap: spacing[4],
  minHeight: '6rem',
  minWidth: 0,
  padding: spacing[4],

  '@media (max-width: 48rem)': {
    gap: spacing[3],
    minHeight: '5.5rem',
    padding: spacing[3],
  },
});

export const MetricIcon = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'tone',
})<{ tone?: IconTone }>(({ tone = 'primary' }) => {
  const iconTone = iconToneTokens[tone];

  return {
    alignItems: 'center',
    background: iconTone.background,
    borderRadius: borderRadius.full,
    color: iconTone.color,
    display: 'grid',
    flexShrink: 0,
    height: '3.25rem',
    justifyItems: 'center',
    width: '3.25rem',
    '& .MuiSvgIcon-root': {
      color: 'inherit',
    },

    '@media (max-width: 48rem)': {
      height: '2.75rem',
      width: '2.75rem',
    },
  };
});

export const MetricValue = styled(Typography)({
  color: colorTokens.textPrimary,
  fontSize: fontSize['2xl'],
  fontWeight: fontWeight.extraBold,
  lineHeight: 1.1,

  '@media (max-width: 48rem)': {
    fontSize: fontSize.xl,
  },
});

export const MetricLabel = styled(Typography)({
  color: colorTokens.textPrimary,
  fontSize: fontSize.base,

  '@media (max-width: 48rem)': {
    fontSize: fontSize.sm,
  },
});

export const MetricHelper = styled(Typography)({
  color: colorTokens.feedbackSuccess,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  marginTop: spacing[2],
});
