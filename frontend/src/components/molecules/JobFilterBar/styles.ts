import { styled } from '@mui/material/styles';

import { borderRadius, colorTokens, fontSize, fontWeight, jobFeedTokens, spacing } from '@/tokens';

/** Matches AppLayout compact breakpoint (760px). */
const compactBreakpoint = '@media (max-width: 47.5rem)';

export const FilterShell = styled('div')({
  alignItems: 'center',
  display: 'grid',
  gap: spacing[1],
  gridTemplateColumns: '1fr',
  minWidth: 0,
  position: 'relative',
  width: '100%',

  [compactBreakpoint]: {
    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
  },
});

export const FilterTrack = styled('div')({
  display: 'flex',
  flexWrap: 'nowrap',
  gap: spacing[2],
  minWidth: 0,
  overflowX: 'auto',
  overscrollBehaviorX: 'contain',
  paddingBlock: spacing[1],
  scrollbarWidth: 'none',
  WebkitOverflowScrolling: 'touch',
  width: '100%',

  '&::-webkit-scrollbar': {
    display: 'none',
  },

  '& > *': {
    flex: '0 0 auto',
  },
});

export const FilterScrollButton = styled('button', {
  shouldForwardProp: (prop) => prop !== 'hiddenOnDesktop',
})<{ hiddenOnDesktop?: boolean }>(({ hiddenOnDesktop = true }) => ({
  alignItems: 'center',
  background: colorTokens.backgroundCard,
  border: `0.0625rem solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.lg,
  color: colorTokens.textPrimary,
  cursor: 'pointer',
  display: hiddenOnDesktop ? 'none' : 'inline-flex',
  flexShrink: 0,
  height: spacing[10],
  justifyContent: 'center',
  padding: 0,
  transition: 'background 160ms ease, border-color 160ms ease, color 160ms ease',
  width: spacing[10],

  '&:hover:not(:disabled)': {
    background: colorTokens.actionPrimarySurface,
    borderColor: colorTokens.borderHover,
    color: colorTokens.actionPrimary,
  },

  '&:focus-visible': {
    boxShadow: `${colorTokens.actionPrimarySubtle} 0 0 0 0.25rem`,
    outline: 0,
  },

  '&:disabled': {
    color: colorTokens.textTertiary,
    cursor: 'not-allowed',
    opacity: 0.45,
  },

  [compactBreakpoint]: {
    display: 'inline-flex',
  },
}));

/** @deprecated Prefer FilterTrack; kept for any external imports. */
export const FilterRoot = FilterTrack;

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
    color: colorTokens.actionPrimary,
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
  paddingInline: spacing[4],
  position: 'relative',
  transition: 'background 160ms ease, border-color 160ms ease, color 160ms ease',
  whiteSpace: 'nowrap',
  zIndex: 0,

  '&:hover, &:focus-visible': {
    zIndex: 1,
  },
}));
