import type { SxProps, Theme } from '@mui/material/styles';

import { borderRadius, colorTokens, fontSize, fontWeight, spacing } from '@/tokens';

const compactBreakpoint = '@media (max-width: 47.5rem)';

/** Typography + field styles aligned with Applications / Saved Jobs page tokens. */
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
  /** Matches applications SectionTitle (dialog section headers). */
  sectionTitle: {
    color: colorTokens.textPrimary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    letterSpacing: '-0.01em',
    lineHeight: 1.25,
    m: 0,
  },
  sectionHelper: {
    color: colorTokens.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: 1.45,
  },
  subsectionTitle: {
    color: colorTokens.textPrimary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semiBold,
    lineHeight: 1.25,
    m: 0,
  },
  bodyText: {
    color: colorTokens.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: 1.5,
  },
  bodySecondary: {
    color: colorTokens.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: 1.45,
  },
  labelStrong: {
    color: colorTokens.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semiBold,
    lineHeight: 1.4,
  },
  sectionBadge: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    height: '1.375rem',
  },
  sidebarTitle: {
    color: colorTokens.textPrimary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    lineHeight: 1.25,
  },
  sidebarItemTitle: {
    color: colorTokens.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semiBold,
    lineHeight: 1.4,
  },
  sidebarItemCaption: {
    color: colorTokens.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: 1.4,
  },
  summaryTitle: {
    color: colorTokens.textPrimary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    mb: 1.5,
  },
  summaryStat: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  summaryBody: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semiBold,
  },
  summaryCaption: {
    color: colorTokens.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: 1.45,
  },
  summaryHighlight: {
    color: colorTokens.actionPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    mb: 0.75,
  },
  summaryListItem: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: 1.45,
  },
  tipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semiBold,
    lineHeight: 1.45,
  },
  errorText: {
    color: colorTokens.feedbackError,
    fontSize: fontSize.xs,
    lineHeight: 1.25,
    m: 0,
    mt: 0.5,
  },
  successText: {
    color: colorTokens.feedbackSuccess,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: 1.45,
  },
  formLabel: {
    color: colorTokens.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semiBold,
    lineHeight: 1.4,
    mb: 0.75,
  },
  radioLabel: {
    '& .MuiFormControlLabel-label': {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      lineHeight: 1.45,
    },
  },
} satisfies Record<string, SxProps<Theme>>;

/** Matches `@/components/atoms/Input` field sizing for raw MUI TextFields. */
export const setupFieldSx: SxProps<Theme> = {
  '& .MuiInputBase-input': {
    color: colorTokens.textPrimary,
    fontSize: fontSize.base,
  },
  '& .MuiInputLabel-root': {
    color: colorTokens.textSecondary,
    fontSize: fontSize.sm,
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: colorTokens.textSecondary,
  },
  '& .MuiFormHelperText-root': {
    color: colorTokens.textSecondary,
    fontSize: fontSize.xs,
    lineHeight: 1.25,
    marginInline: 0,
    mt: spacing[1],
  },
  '& .MuiOutlinedInput-root': {
    borderRadius: borderRadius.lg,
    minHeight: spacing[12],
  },
};
