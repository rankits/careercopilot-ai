import { styled } from '@/lib/material';
import { spacing } from '@/tokens';

export const VirtualListRoot = styled('div')({
  display: 'grid',
  gap: spacing[3],
});

export const VirtualListItem = styled('div')({
  containIntrinsicSize: '8rem',
  contentVisibility: 'auto',
});
