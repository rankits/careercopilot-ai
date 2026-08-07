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

export const FilterFieldRoot = styled('div', {
  shouldForwardProp: (prop) => prop !== 'fullWidth',
})<{ fullWidth?: boolean }>(({ fullWidth }) => ({
  display: 'grid',
  minWidth: 0,
  width: fullWidth ? '100%' : 'auto',
}));

export const DropdownButtonLabel = styled('span')({
  alignItems: 'center',
  display: 'inline-flex',
  gap: spacing[2],
  minWidth: 0,
  overflow: 'hidden',
});

export const DropdownButtonPrefix = styled('span')({
  color: colorTokens.textSecondary,
  flexShrink: 0,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.semiBold,
  letterSpacing: '0.02em',
});

export const DropdownButtonValue = styled('span')({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const DropdownButton = styled('button', {
  shouldForwardProp: (prop) => prop !== 'fullWidth' && prop !== 'bordered',
})<{ bordered?: boolean; fullWidth: boolean }>(({ bordered = true, fullWidth }) => ({
  '&:focus-visible': {
    boxShadow: `${colorTokens.actionPrimarySubtle} 0 0 0 0.25rem`,
    outline: 0,
  },
  '&:hover': {
    background: colorTokens.actionPrimarySurface,
    borderColor: colorTokens.borderHover,
    color: colorTokens.actionPrimary,
  },
  '&[aria-expanded="true"]': {
    background: colorTokens.actionPrimarySurface,
    borderColor: colorTokens.actionPrimary,
    boxShadow: bordered ? shadows.card : 'none',
    color: colorTokens.actionPrimary,
  },
  alignItems: 'center',
  background: bordered ? jobFeedTokens.filterBackground : 'transparent',
  border: bordered ? `0.0625rem solid ${colorTokens.borderDefault}` : 'none',
  borderRadius: borderRadius.lg,
  color: colorTokens.textPrimary,
  cursor: 'pointer',
  display: 'grid',
  fontSize: fontSize.sm,
  fontWeight: fontWeight.bold,
  gap: spacing[2],
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  justifyItems: 'start',
  minHeight: spacing[10],
  minWidth: 0,
  paddingInline: bordered ? spacing[4] : 0,
  textAlign: 'left',
  transition:
    'box-shadow 160ms ease, background 160ms ease, border-color 160ms ease, color 160ms ease',
  width: fullWidth ? '100%' : 'auto',

  '& svg': {
    color: 'currentColor',
    flexShrink: 0,
    justifySelf: 'end',
    opacity: 0.72,
    transition: 'transform 160ms ease, opacity 160ms ease',
  },

  '&:hover svg, &[aria-expanded="true"] svg': {
    opacity: 1,
  },

  '&[aria-expanded="true"] svg': {
    transform: 'rotate(180deg)',
  },
}));
