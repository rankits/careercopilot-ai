import { styled } from '@/lib/material';
import { borderRadius, colorTokens, spacing } from '@/tokens';

const mobileBreakpoint = '@media (max-width: 47.5rem)';

export const dialogPaperSx = {
  borderRadius: borderRadius['2xl'],
  display: 'flex',
  flexDirection: 'column',
  margin: 0,
  maxHeight:
    'min(40rem, calc(100dvh - 2rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)))',
  overflow: 'hidden',
  width: '100%',
  [mobileBreakpoint]: {
    borderRadius: borderRadius.xl,
    maxHeight:
      'calc(100dvh - 1rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
  },
} as const;

export const dialogContainerSx = {
  alignItems: 'center',
  padding: `max(${spacing[3]}, env(safe-area-inset-top, 0px)) ${spacing[3]} max(${spacing[3]}, env(safe-area-inset-bottom, 0px))`,
  [mobileBreakpoint]: {
    alignItems: 'flex-end',
    padding: `max(${spacing[2]}, env(safe-area-inset-top, 0px)) ${spacing[2]} max(${spacing[2]}, env(safe-area-inset-bottom, 0px))`,
  },
} as const;

export const dialogTitleSx = {
  flexShrink: 0,
  fontWeight: 800,
  pb: spacing[1],
  px: spacing[3],
  pt: spacing[3],
  [mobileBreakpoint]: {
    fontSize: '1.15rem',
    lineHeight: 1.25,
    px: spacing[3],
    pt: spacing[3],
  },
} as const;

export const dialogContentSx = {
  flex: '1 1 auto',
  minHeight: 0,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  px: spacing[3],
  py: spacing[2],
  WebkitOverflowScrolling: 'touch',
} as const;

export const dialogActionsSx = {
  flexShrink: 0,
  gap: spacing[2],
  justifyContent: 'flex-end',
  px: spacing[3],
  pb: spacing[3],
  pt: spacing[2],
  [mobileBreakpoint]: {
    pb: `calc(${spacing[3]} + env(safe-area-inset-bottom, 0px))`,
    '& > :not(style)': {
      margin: 0,
      width: '100%',
    },
  },
} as const;

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
  minWidth: 0,
  padding: spacing[3],

  [mobileBreakpoint]: {
    alignItems: 'stretch',
    flexDirection: 'column',

    '& > button': {
      width: '100%',
    },
  },
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
