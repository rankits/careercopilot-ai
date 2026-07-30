import type { SxProps, Theme } from '@/lib/material';
import { borderRadius, colorTokens, fontSize, fontWeight, jobFeedTokens, spacing } from '@/tokens';

export const jobFeedPageSx = {
  header: {
    display: 'grid',
    gap: spacing[1],
  },
  filters: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  list: {
    maxHeight: 'calc(100vh - 15rem)',
    minHeight: 0,
    overflowX: 'hidden',
    overflowY: 'auto',
    padding: `${spacing[1]} ${spacing[1]} ${spacing[2]} 0`,
    scrollbarColor: `${jobFeedTokens.scrollbarThumb} ${jobFeedTokens.scrollbarTrack}`,
    scrollbarWidth: 'thin',

    '&::-webkit-scrollbar': {
      width: spacing[2],
    },

    '&::-webkit-scrollbar-track': {
      background: jobFeedTokens.scrollbarTrack,
      borderRadius: borderRadius.full,
    },

    '&::-webkit-scrollbar-thumb': {
      background: jobFeedTokens.scrollbarThumb,
      borderRadius: borderRadius.full,
    },

    '@media (max-width: 48rem)': {
      maxHeight: 'calc(100vh - 14rem)',
    },
  },
  root: {
    display: 'grid',
    gap: spacing[5],
    marginInline: 'auto',
    maxWidth: '70rem',
    width: '100%',
  },
  subtitle: {
    color: colorTokens.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  title: {
    color: colorTokens.textPrimary,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.extraBold,
    lineHeight: 1.2,
    margin: 0,
  },
} satisfies Record<string, SxProps<Theme>>;
