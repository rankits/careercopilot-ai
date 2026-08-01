import { Box, IconButton, styled } from '@/lib/material';
import { borderRadius, colorTokens, spacing } from '@/tokens';

const mobileBreakpoint = '@media (max-width: 47.5rem)';
const tabletBreakpoint = '@media (max-width: 75rem)';

export const StatusTabsScrollerRoot = styled(Box)({
  alignItems: 'center',
  borderBottom: `0.0625rem solid ${colorTokens.borderDefault}`,
  display: 'flex',
  gap: spacing[2],
  maxWidth: '100%',
  minHeight: spacing[12],
  minWidth: 0,
  overflow: 'hidden',
  paddingBlock: spacing[3],
  paddingInline: spacing[4],
  width: '100%',

  [tabletBreakpoint]: {
    paddingInline: spacing[3],
  },

  [mobileBreakpoint]: {
    gap: spacing[1],
    minHeight: spacing[10],
    paddingBlock: spacing[2],
    paddingInline: spacing[2],
  },
});

export const StatusTabsTrack = styled(Box)({
  flex: 1,
  minWidth: 0,
  position: 'relative',
});

export const StatusTabsRow = styled('div')({
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'nowrap',
  gap: spacing[2],
  overflowX: 'auto',
  paddingBlock: spacing[1],
  scrollbarWidth: 'none',
  WebkitOverflowScrolling: 'touch',

  '&::-webkit-scrollbar': {
    display: 'none',
  },

  [mobileBreakpoint]: {
    gap: spacing[1],
  },
});

export const StatusTabsScrollButton = styled(IconButton)({
  '&:disabled': {
    background: colorTokens.backgroundCard,
    color: colorTokens.textTertiary,
    opacity: 0.55,
  },
  '&:hover:not(:disabled)': {
    background: colorTokens.actionPrimarySurface,
    borderColor: colorTokens.actionPrimary,
    color: colorTokens.actionPrimary,
  },
  background: colorTokens.backgroundCard,
  border: `0.0625rem solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.full,
  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
  color: colorTokens.textSecondary,
  flexShrink: 0,
  height: spacing[8],
  width: spacing[8],

  [mobileBreakpoint]: {
    height: spacing[6],
    width: spacing[6],
  },
});

export const StatusTabsFade = styled('span', {
  shouldForwardProp: (prop) => prop !== 'edge' && prop !== 'visible',
})<{ edge: 'left' | 'right'; visible: boolean }>(({ edge, visible }) => ({
  bottom: 0,
  opacity: visible ? 1 : 0,
  pointerEvents: 'none',
  position: 'absolute',
  top: 0,
  transition: 'opacity 180ms ease',
  width: '2.5rem',
  zIndex: 1,
  ...(edge === 'left'
    ? {
        background: 'linear-gradient(90deg, #ffffff 20%, rgba(255, 255, 255, 0))',
        left: 0,
      }
    : {
        background: 'linear-gradient(270deg, #ffffff 20%, rgba(255, 255, 255, 0))',
        right: 0,
      }),
}));
