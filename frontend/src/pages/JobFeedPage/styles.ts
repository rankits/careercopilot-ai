import type { SxProps, Theme } from '@mui/material/styles';

import { colorTokens, fontSize, fontWeight, spacing } from '@/tokens';

/** Matches AppLayout compact breakpoint (760px). */
const compactBreakpoint = '@media (max-width: 47.5rem)';
const desktopBreakpoint = '@media (min-width: 64.01rem)';

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
  /**
   * Always stacked rows so chips never fight Salary/Sort for width.
   * Desktop: search + controls share the first row; chips get a full scroll row.
   */
  filters: {
    alignItems: 'stretch',
    display: 'grid',
    gap: spacing[3],
    gridTemplateAreas: `
      "search"
      "chips"
      "controls"
    `,
    gridTemplateColumns: '1fr',
    width: '100%',

    [desktopBreakpoint]: {
      alignItems: 'center',
      gap: spacing[3],
      gridTemplateAreas: `
        "search controls"
        "chips chips"
      `,
      gridTemplateColumns: 'minmax(0, 1fr) auto',
    },
  },
  search: {
    gridArea: 'search',
    minWidth: 0,
    position: 'relative',
    width: '100%',
    zIndex: 1,
  },
  chips: {
    gridArea: 'chips',
    minWidth: 0,
    position: 'relative',
    width: '100%',
    zIndex: 0,
  },
  controls: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'nowrap',
    gap: spacing[2],
    gridArea: 'controls',
    minWidth: 0,

    [compactBreakpoint]: {
      display: 'grid',
      flexWrap: 'wrap',
      gridTemplateColumns: '1fr 1fr',
      width: '100%',

      '& > :nth-of-type(n + 3)': {
        gridColumn: '1 / -1',
      },
    },
  },
  listHeader: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing[2],
    justifyContent: 'flex-start',
    minWidth: 0,
    width: '100%',
  },
  resultCount: {
    color: colorTokens.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  list: {
    display: 'grid',
    gap: spacing[2],
    minHeight: 0,
  },
  root: {
    display: 'grid',
    gap: spacing[5],
    width: '100%',

    [compactBreakpoint]: {
      gap: spacing[4],
    },
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

    [compactBreakpoint]: {
      fontSize: fontSize.xl,
    },
  },
} satisfies Record<string, SxProps<Theme>>;
