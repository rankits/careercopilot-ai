import { styled } from '@/lib/material';
import { borderRadius, colorTokens, spacing } from '@/tokens';

export const VersionsList = styled('div')({
  display: 'grid',
  gap: spacing[2],
});

export const VersionRow = styled('div')({
  alignItems: 'center',
  backgroundColor: colorTokens.backgroundCard,
  border: `1px solid ${colorTokens.borderSubtle}`,
  borderRadius: borderRadius.xl,
  display: 'flex',
  gap: spacing[2],
  justifyContent: 'space-between',
  padding: spacing[3],
});

export const VersionMeta = styled('div')({
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing[2],
  marginTop: spacing[1],
});

export const VersionsEmpty = styled('div')({
  alignItems: 'center',
  backgroundColor: colorTokens.backgroundApp,
  border: `1px dashed ${colorTokens.borderSubtle}`,
  borderRadius: borderRadius.xl,
  display: 'grid',
  gap: spacing[2],
  justifyItems: 'center',
  padding: spacing[6],
  textAlign: 'center',
});
