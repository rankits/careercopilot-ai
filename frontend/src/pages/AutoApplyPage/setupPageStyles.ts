import type { SxProps, Theme } from '@mui/material/styles';

import { colorTokens, fontSize, fontWeight } from '@/tokens';

const compactBreakpoint = '@media (max-width: 47.5rem)';

export const setupPageSx = {
  pageTitle: {
    color: colorTokens.textPrimary,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.extraBold,
    letterSpacing: '-0.03em',
    lineHeight: 1.2,
    mb: 0.5,

    [compactBreakpoint]: {
      fontSize: fontSize.xl,
    },
  },
  pageSubtitle: {
    color: colorTokens.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: 1.5,
    maxWidth: '46.25rem',
  },
  progressLabel: {
    color: colorTokens.textSecondary,
    flexShrink: 0,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semiBold,
  },
  progressValue: {
    color: colorTokens.textSecondary,
    flexShrink: 0,
    fontSize: fontSize.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    letterSpacing: '-0.02em',
    lineHeight: 1.3,
    m: 0,
  },
  sectionHelper: {
    color: colorTokens.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 1.5,
  },
  sectionBadge: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    height: '1.375rem',
  },
  sidebarTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    lineHeight: 1.3,
  },
  sidebarItemTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semiBold,
  },
  sidebarItemCaption: {
    color: colorTokens.textSecondary,
    fontSize: fontSize.xs,
    lineHeight: 1.4,
  },
  summaryTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    mb: 1.5,
  },
  summaryStat: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  summaryBody: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  summaryCaption: {
    color: colorTokens.textSecondary,
    fontSize: fontSize.xs,
    lineHeight: 1.4,
  },
  summaryHighlight: {
    color: colorTokens.actionPrimary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    mb: 0.75,
  },
  summaryListItem: {
    fontSize: fontSize.xs,
  },
  tipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semiBold,
  },
} satisfies Record<string, SxProps<Theme>>;
