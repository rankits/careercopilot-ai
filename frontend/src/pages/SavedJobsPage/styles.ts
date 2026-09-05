import type { SxProps, Theme } from '@mui/material/styles';

import { borderRadius, colorTokens, fontSize, fontWeight, shadows, spacing } from '@/tokens';

const compactBreakpoint = '@media (max-width: 47.5rem)';

export const savedJobsPageSx = {
  root: {
    display: 'grid',
    gap: spacing[5],
    width: '100%',

    [compactBreakpoint]: {
      gap: spacing[4],
    },
  },
  header: {
    alignItems: 'center',
    display: 'grid',
    gap: spacing[4],
    gridTemplateColumns: 'auto minmax(0, 1fr)',

    [compactBreakpoint]: {
      gap: spacing[3],
    },
  },
  headerIcon: {
    alignItems: 'center',
    background: colorTokens.actionPrimarySurface,
    borderRadius: borderRadius.xl,
    color: colorTokens.actionPrimary,
    display: 'grid',
    flexShrink: 0,
    height: spacing[12],
    justifyItems: 'center',
    width: spacing[12],
  },
  headerCopy: {
    display: 'grid',
    gap: spacing[1],
    minWidth: 0,
  },
  title: {
    color: colorTokens.textPrimary,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.extraBold,
    lineHeight: 1.2,
    margin: 0,

    [compactBreakpoint]: {
      fontSize: fontSize.xl,
    },
  },
  subtitle: {
    color: colorTokens.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  toolbar: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'flex-end',
    width: '100%',
  },
  controls: {
    flex: '0 0 auto',
    minWidth: '12rem',

    [compactBreakpoint]: {
      flex: '1 1 100%',
      minWidth: 0,
      width: '100%',
    },
  },
  list: {
    display: 'grid',
    gap: spacing[3],
    listStyle: 'none',
    margin: 0,
    minWidth: 0,
    padding: 0,
  },
  cta: {
    alignItems: 'center',
    background: colorTokens.actionPrimarySurface,
    border: `0.0625rem solid ${colorTokens.borderSubtle}`,
    borderRadius: borderRadius.xl,
    display: 'grid',
    gap: spacing[4],
    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
    padding: spacing[4],

    [compactBreakpoint]: {
      gridTemplateColumns: '1fr',
      justifyItems: 'start',
      textAlign: 'left',
    },
  },
  ctaArt: {
    height: '4.5rem',
    width: '4.5rem',

    '& img': {
      display: 'block',
      height: '100%',
      objectFit: 'contain',
      width: '100%',
    },
  },
  ctaCopy: {
    display: 'grid',
    gap: spacing[1],
    minWidth: 0,
  },
  ctaTitle: {
    color: colorTokens.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extraBold,
    margin: 0,
  },
  ctaDescription: {
    color: colorTokens.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  empty: {
    alignItems: 'center',
    background: colorTokens.backgroundCard,
    border: `0.0625rem solid ${colorTokens.borderSubtle}`,
    borderRadius: borderRadius.xl,
    boxShadow: shadows.card,
    display: 'grid',
    gap: spacing[3],
    justifyItems: 'center',
    padding: `${spacing[8]} ${spacing[4]}`,
    textAlign: 'center',
  },
  emptyIcon: {
    alignItems: 'center',
    background: colorTokens.actionPrimarySurface,
    borderRadius: borderRadius.xl,
    color: colorTokens.actionPrimary,
    display: 'grid',
    height: spacing[12],
    justifyItems: 'center',
    width: spacing[12],
  },
  emptyTitle: {
    color: colorTokens.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.extraBold,
    margin: 0,
  },
  emptyDescription: {
    color: colorTokens.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    maxWidth: '28rem',
  },
} satisfies Record<string, SxProps<Theme>>;
