import { Box, styled } from '@/lib/material';
import { borderRadius, colorTokens, spacing } from '@/tokens';

export const Root = styled(Box)({
  display: 'grid',
  gap: spacing[5],
  maxWidth: 960,
  margin: '0 auto',
  width: '100%',
  paddingBottom: spacing[8],
});

export const PageHeader = styled(Box)({
  alignItems: 'flex-start',
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing[3],
  justifyContent: 'space-between',
});

export const VersionsGrid = styled(Box)({
  display: 'grid',
  gap: spacing[4],
});

export const VersionCard = styled(Box)({
  background: colorTokens.backgroundCard,
  border: `1px solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius['2xl'],
  display: 'grid',
  gap: spacing[4],
  padding: spacing[5],
});

export const VersionMeta = styled(Box)({
  alignItems: 'flex-start',
  display: 'flex',
  gap: spacing[3],
  justifyContent: 'space-between',
});

export const JdBlock = styled(Box)({
  background: colorTokens.actionPrimarySurface,
  borderRadius: borderRadius.lg,
  color: colorTokens.textSecondary,
  fontSize: '0.875rem',
  lineHeight: 1.5,
  padding: spacing[3],
  whiteSpace: 'pre-wrap',
});

export const EmptyState = styled(Box)({
  alignItems: 'center',
  border: `1px dashed ${colorTokens.borderDefault}`,
  borderRadius: borderRadius['2xl'],
  display: 'grid',
  gap: spacing[3],
  justifyItems: 'center',
  padding: `${spacing[10]} ${spacing[5]}`,
  textAlign: 'center',
});
