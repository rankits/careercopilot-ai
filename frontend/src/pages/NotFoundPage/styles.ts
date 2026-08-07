import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';

import { borderRadius, colorTokens, fontSize, fontWeight, shadows, spacing } from '@/tokens';

export const NotFoundRoot = styled('div')({
  alignItems: 'center',
  background:
    'radial-gradient(circle at top left, rgba(99, 91, 255, 0.08), transparent 28rem), #f8fafc',
  display: 'grid',
  justifyItems: 'center',
  minHeight: '100dvh',
  padding: spacing[6],
});

export const NotFoundCard = styled(Box)({
  alignItems: 'center',
  background: colorTokens.backgroundCard,
  border: `0.0625rem solid ${colorTokens.borderSubtle}`,
  borderRadius: borderRadius.xl,
  boxShadow: shadows.card,
  display: 'grid',
  gap: spacing[3],
  justifyItems: 'center',
  maxWidth: '28rem',
  padding: `${spacing[8]} ${spacing[6]}`,
  textAlign: 'center',
  width: '100%',
});

export const NotFoundIconWrap = styled(Box)({
  alignItems: 'center',
  background: colorTokens.actionPrimarySurface,
  borderRadius: borderRadius.full,
  color: colorTokens.actionPrimary,
  display: 'grid',
  height: spacing[12],
  justifyItems: 'center',
  width: spacing[12],
});

export const NotFoundEyebrow = styled('p')({
  color: colorTokens.actionPrimary,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.extraBold,
  letterSpacing: '0.14em',
  margin: 0,
  textTransform: 'uppercase',
});

export const NotFoundTitle = styled('h1')({
  color: colorTokens.textPrimary,
  fontSize: fontSize['2xl'],
  fontWeight: fontWeight.bold,
  lineHeight: 1.2,
  margin: 0,
});

export const NotFoundDescription = styled('p')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.sm,
  lineHeight: 1.6,
  margin: 0,
  maxWidth: '22rem',
});
