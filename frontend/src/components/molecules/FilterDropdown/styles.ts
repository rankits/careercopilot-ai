import { styled } from '@/lib/material';
import { borderRadius, colorTokens, fontSize, fontWeight, jobFeedTokens, spacing } from '@/tokens';

export const DropdownButton = styled('button', {
  shouldForwardProp: (prop) => prop !== 'fullWidth',
})<{ fullWidth: boolean }>(({ fullWidth }) => ({
  alignItems: 'center',
  background: jobFeedTokens.filterBackground,
  border: `0.0625rem solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.lg,
  color: colorTokens.textPrimary,
  cursor: 'pointer',
  display: 'grid',
  fontSize: fontSize.sm,
  fontWeight: fontWeight.bold,
  gap: spacing[2],
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  minHeight: spacing[10],
  minWidth: 0,
  paddingInline: spacing[4],
  textAlign: 'center',
  width: fullWidth ? '100%' : '10rem',

  '& svg': {
    justifySelf: 'end',
  },

  '& span': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
}));
