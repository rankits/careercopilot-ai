import { styled } from '@mui/material/styles';

import { colorTokens, fontSize, fontWeight, spacing } from '@/tokens';

export const VirtualListRoot = styled('div')({
  minHeight: 0,
  overflow: 'visible',
  padding: `${spacing[1]} ${spacing[1]} ${spacing[2]} 0`,
  position: 'relative',
  width: '100%',
});

export const VirtualListSpacer = styled('div')({
  position: 'relative',
  width: '100%',
});

export const VirtualListItem = styled('div')({
  left: 0,
  position: 'absolute',
  top: 0,
  width: '100%',
});

export const VirtualListLoadingMore = styled('div')({
  alignItems: 'center',
  color: colorTokens.textSecondary,
  display: 'flex',
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  gap: spacing[2],
  justifyContent: 'center',
  padding: `${spacing[3]} 0 ${spacing[2]}`,
  width: '100%',
});
