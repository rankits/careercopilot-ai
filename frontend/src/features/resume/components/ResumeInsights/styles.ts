import { Box, styled } from '@/lib/material';
import { borderRadius, borderWidth, colorTokens, spacing } from '@/tokens';

export const InsightsCard = styled(Box)({
  background: colorTokens.backgroundCard,
  border: `${borderWidth.thin} solid ${colorTokens.borderSubtle}`,
  borderRadius: borderRadius.xl,
  display: 'grid',
  gap: spacing[4],
  padding: spacing[5],
});
