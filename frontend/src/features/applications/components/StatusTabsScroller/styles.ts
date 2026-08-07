import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import { styled } from '@mui/material/styles';

import { borderRadius, colorTokens, shadows, spacing } from '@/tokens';

const compactBreakpoint = '@media (max-width: 47.5rem)';

export const StatusTabsScrollerRoot = styled(Box)({
  alignItems: 'center',
  display: 'flex',
  gap: spacing[2],
  maxWidth: '100%',
  minHeight: spacing[12],
  minWidth: 0,
  overflow: 'hidden',
  width: '100%',

  [compactBreakpoint]: {
    gap: spacing[1],
    minHeight: spacing[10],
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

  [compactBreakpoint]: {
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
  border: `0.0625rem solid ${colorTokens.borderSubtle}`,
  borderRadius: borderRadius.full,
  boxShadow: shadows.card,
  color: colorTokens.textSecondary,
  flexShrink: 0,
  height: spacing[8],
  width: spacing[8],

  [compactBreakpoint]: {
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
        background: `linear-gradient(90deg, ${colorTokens.backgroundApp} 20%, transparent)`,
        left: 0,
      }
    : {
        background: `linear-gradient(270deg, ${colorTokens.backgroundApp} 20%, transparent)`,
        right: 0,
      }),
}));
