import { styled } from '@/lib/material';
import {
  borderRadius,
  colorTokens,
  fontSize,
  fontWeight,
  jobFeedTokens,
  shadows,
  spacing,
} from '@/tokens';

export const FilterRoot = styled('div')({
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing[3],
});

export const FilterButton = styled('button', {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active: boolean }>(({ active }) => ({
  '&:focus-visible': {
    boxShadow: `${colorTokens.actionPrimarySubtle} 0 0 0 0.25rem`,
    outline: 0,
  },
  '&:hover': {
    background: colorTokens.actionPrimarySurface,
    borderColor: colorTokens.borderHover,
    boxShadow: shadows.card,
    color: colorTokens.actionPrimary,
    transform: 'translateY(-0.0625rem)',
  },
  alignItems: 'center',
  background: active ? colorTokens.actionPrimarySurface : jobFeedTokens.filterBackground,
  border: `0.0625rem solid ${active ? colorTokens.actionPrimary : colorTokens.borderDefault}`,
  borderRadius: borderRadius.lg,
  boxShadow: 'none',
  color: active ? colorTokens.actionPrimary : colorTokens.textPrimary,
  cursor: 'pointer',
  display: 'inline-flex',
  fontSize: fontSize.sm,
  fontWeight: fontWeight.bold,
  gap: spacing[2],
  minHeight: spacing[10],
  paddingInline: spacing[5],
  transition: 'transform 160ms ease, box-shadow 160ms ease, background 160ms ease',
}));
