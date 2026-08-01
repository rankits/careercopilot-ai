import type { SxProps, Theme } from '@/lib/material';
import { colorTokens, fontSize, fontWeight, spacing } from '@/tokens';

export const jobFeedPageSx = {
  activeChips: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing[1],
  },
  header: {
    display: 'grid',
    gap: spacing[1],
  },
  filters: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'nowrap',
    gap: spacing[2],

    '& > [aria-label="Job filters"]': {
      flex: '0 1 auto',
    },

    '@media (max-width: 78rem)': {
      flexWrap: 'wrap',
    },
  },
  list: {
    display: 'grid',
    gap: spacing[2],
    minHeight: 0,
  },
  root: {
    display: 'grid',
    gap: spacing[5],
    marginInline: 'auto',
    maxWidth: '82rem',
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
