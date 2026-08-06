import type { SxProps, Theme } from '@/lib/material';
import {
  borderRadius,
  colorTokens,
  fontSize,
  fontWeight,
  jobFeedTokens,
  shadows,
  spacing,
} from '@/tokens';

const tabletBreakpoint = '@media (max-width: 64rem)';
const compactBreakpoint = '@media (max-width: 47.5rem)';

export const jobDetailPageSx = {
  root: {
    display: 'grid',
    gap: spacing[4],
    padding: `${spacing[2]} 0 ${spacing[6]}`,
    width: '100%',

    [compactBreakpoint]: {
      gap: spacing[3],
      paddingBottom: spacing[8],
    },
  } satisfies SxProps<Theme>,

  backButton: {
    justifySelf: 'start',
  } satisfies SxProps<Theme>,

  content: {
    display: 'grid',
    gap: spacing[4],

    [compactBreakpoint]: {
      gap: spacing[3],
    },
  } satisfies SxProps<Theme>,

  hero: {
    background: colorTokens.backgroundCard,
    border: `0.0625rem solid ${colorTokens.borderDefault}`,
    borderRadius: borderRadius.xl,
    boxShadow: shadows.card,
    display: 'grid',
    gap: spacing[3],
    padding: spacing[5],

    [tabletBreakpoint]: {
      padding: spacing[4],
    },

    [compactBreakpoint]: {
      gap: spacing[3],
      padding: spacing[3],
    },
  } satisfies SxProps<Theme>,

  heroTop: {
    alignItems: 'flex-start',
    display: 'grid',
    gap: spacing[3],
    gridTemplateColumns: 'auto minmax(0, 1fr)',

    [compactBreakpoint]: {
      gridTemplateColumns: '1fr',
    },
  } satisfies SxProps<Theme>,

  companyLogo: {
    alignItems: 'center',
    background: jobFeedTokens.companyLogoSurface,
    border: `0.0625rem solid ${colorTokens.borderSubtle}`,
    borderRadius: borderRadius.lg,
    color: colorTokens.textPrimary,
    display: 'grid',
    flexShrink: 0,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.extraBold,
    height: spacing[14],
    justifyItems: 'center',
    width: spacing[14],

    [compactBreakpoint]: {
      height: spacing[12],
      width: spacing[12],
    },
  } satisfies SxProps<Theme>,

  heroCopy: {
    display: 'grid',
    gap: spacing[1],
    minWidth: 0,
  } satisfies SxProps<Theme>,

  title: {
    color: colorTokens.textPrimary,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.extraBold,
    lineHeight: 1.2,
    margin: 0,
    overflowWrap: 'anywhere',

    [compactBreakpoint]: {
      fontSize: fontSize.xl,
    },
  } satisfies SxProps<Theme>,

  subtitle: {
    color: colorTokens.textSecondary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    overflowWrap: 'anywhere',

    [compactBreakpoint]: {
      fontSize: fontSize.base,
    },
  } satisfies SxProps<Theme>,

  metaRow: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing[1],
    marginTop: spacing[1],
  } satisfies SxProps<Theme>,

  metaChip: {
    background: colorTokens.actionPrimarySurface,
    border: `0.0625rem solid ${colorTokens.borderSubtle}`,
    borderRadius: borderRadius.md,
    color: colorTokens.actionPrimary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    padding: `${spacing[1]} ${spacing[2]}`,
  } satisfies SxProps<Theme>,

  meta: {
    color: colorTokens.textSecondary,
    fontSize: fontSize.sm,
  } satisfies SxProps<Theme>,

  facts: {
    color: colorTokens.textSecondary,
    display: 'flex',
    flexWrap: 'wrap',
    fontSize: fontSize.sm,
    gap: `${spacing[2]} ${spacing[4]}`,

    '& span': {
      alignItems: 'center',
      display: 'inline-flex',
      gap: spacing[1],
      minWidth: 0,
    },
  } satisfies SxProps<Theme>,

  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing[2],

    [compactBreakpoint]: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      width: '100%',

      '& > *': {
        width: '100%',
      },
    },
  } satisfies SxProps<Theme>,

  muted: {
    color: colorTokens.textSecondary,
  } satisfies SxProps<Theme>,

  skills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing[1],
  } satisfies SxProps<Theme>,

  skill: {
    background: jobFeedTokens.skillBackground,
    border: `0.0625rem solid ${colorTokens.borderSubtle}`,
    borderRadius: borderRadius.md,
    color: jobFeedTokens.skillText,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    padding: `${spacing[1]} ${spacing[2]}`,
  } satisfies SxProps<Theme>,

  description: {
    color: colorTokens.textPrimary,
    fontSize: fontSize.sm,
    lineHeight: 1.6,
    overflowWrap: 'anywhere',
    position: 'relative',
    '& a': { color: colorTokens.actionPrimary },
    '& img, & table, & pre, & iframe': {
      maxWidth: '100%',
    },
    '& pre, & table': {
      display: 'block',
      overflowX: 'auto',
    },
    '& p': { marginBottom: spacing[2] },
    '& ul, & ol': { marginBottom: spacing[2], paddingLeft: spacing[4] },
  } satisfies SxProps<Theme>,

  descriptionBody: {
    margin: 0,
  } satisfies SxProps<Theme>,

  descriptionInline: {
    color: colorTokens.textPrimary,
    display: 'inline',
    fontSize: fontSize.sm,
    lineHeight: 1.6,
    margin: 0,
    overflowWrap: 'anywhere',
    whiteSpace: 'normal',
  } satisfies SxProps<Theme>,

  descriptionToggle: {
    background: 'transparent',
    border: 0,
    color: colorTokens.actionPrimary,
    cursor: 'pointer',
    display: 'inline',
    font: 'inherit',
    fontSize: 'inherit',
    fontWeight: fontWeight.bold,
    lineHeight: 'inherit',
    padding: 0,
    textDecoration: 'underline',
    textUnderlineOffset: '0.15em',
    verticalAlign: 'baseline',
    whiteSpace: 'nowrap',
    width: 'auto',
    '&:hover': {
      color: colorTokens.actionPrimaryHover,
    },
  } satisfies SxProps<Theme>,

  descriptionToggleAfter: {
    display: 'inline-block',
    marginTop: spacing[1],
  } satisfies SxProps<Theme>,

  panel: {
    background: colorTokens.backgroundCard,
    border: `0.0625rem solid ${colorTokens.borderDefault}`,
    borderRadius: borderRadius.xl,
    boxShadow: shadows.card,
    display: 'grid',
    gap: spacing[2],
    padding: spacing[4],

    [compactBreakpoint]: {
      padding: spacing[3],
    },
  } satisfies SxProps<Theme>,

  sectionTitle: {
    color: colorTokens.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extraBold,
    letterSpacing: '-0.01em',
    margin: 0,

    [compactBreakpoint]: {
      fontSize: fontSize.base,
    },
  } satisfies SxProps<Theme>,

  sectionHeader: {
    display: 'grid',
    gap: spacing[2],
  } satisfies SxProps<Theme>,

  sectionHeaderTitleRow: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing[2],
  } satisfies SxProps<Theme>,

  sectionHeaderAccent: {
    background: colorTokens.actionPrimary,
    borderRadius: borderRadius.full,
    flexShrink: 0,
    height: '1.375rem',
    width: spacing[1],
  } satisfies SxProps<Theme>,

  sectionHeaderDivider: {
    borderTop: `0.0625rem solid ${colorTokens.borderSubtle}`,
    width: '100%',
  } satisfies SxProps<Theme>,

  listItem: {
    color: colorTokens.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 1.6,
    margin: 0,
    overflowWrap: 'anywhere',
  } satisfies SxProps<Theme>,

  sectionList: {
    margin: 0,
    paddingInlineStart: spacing[5],
  } satisfies SxProps<Theme>,

  similarSection: {
    display: 'grid',
    gap: spacing[2],
    py: spacing[1],
  } satisfies SxProps<Theme>,
};
