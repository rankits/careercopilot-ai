import { Accordion, Box, styled, type SxProps, type Theme } from '@/lib/material';
import { borderRadius, borderWidth, colorTokens, fontSize, fontWeight, spacing } from '@/tokens';

/** Matches AppLayout compact breakpoint (760px). */
const compactBreakpoint = '@media (max-width: 47.5rem)';

export const StyledAccordion = styled(Accordion)({
  background: colorTokens.backgroundCard,
  border: `${borderWidth.thin} solid ${colorTokens.borderSubtle}`,
  borderRadius: `${borderRadius.xl} !important`,
  boxShadow: 'none',
  maxWidth: '100%',
  minWidth: 0,
  overflow: 'hidden',
  width: '100%',
  '&::before': { display: 'none' },
});

export const ReviewFields = styled(Box)({
  display: 'grid',
  gap: spacing[4],
  gridTemplateColumns: 'minmax(0, 1fr)',
  minWidth: 0,
  width: '100%',

  // Two columns only on comfortable widths — avoid cramped fields on phones.
  '@media (min-width: 48rem)': {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
});

export const reviewSectionSx = {
  details: {
    borderTop: `${borderWidth.thin} solid ${colorTokens.borderSubtle}`,
    p: spacing[4],

    [compactBreakpoint]: {
      p: spacing[3],
    },
  },
  icon: {
    alignItems: 'center',
    bgcolor: colorTokens.actionPrimarySubtle,
    borderRadius: borderRadius.lg,
    color: colorTokens.actionPrimary,
    display: 'flex',
    flexShrink: 0,
    height: spacing[10],
    justifyContent: 'center',
    width: spacing[10],
  },
  input: {
    minWidth: 0,
    width: '100%',
    '& .MuiFormLabel-asterisk': {
      color: colorTokens.feedbackError,
    },
  },
  multilineInput: {
    gridColumn: '1 / -1',
    minWidth: 0,
    width: '100%',
    '& .MuiFormLabel-asterisk': {
      color: colorTokens.feedbackError,
    },
  },
  summary: {
    minHeight: spacing[14],
    minWidth: 0,
    px: spacing[4],

    [compactBreakpoint]: {
      px: spacing[3],
    },

    '& .MuiAccordionSummary-content': {
      flex: '1 1 auto',
      margin: `${spacing[3]} 0`,
      minWidth: 0,
      overflow: 'hidden',
    },

    '& .MuiAccordionSummary-expandIconWrapper': {
      flexShrink: 0,
      marginLeft: spacing[1],
    },
  },
  summaryContent: {
    alignItems: 'flex-start',
    display: 'flex',
    gap: spacing[3],
    minWidth: 0,
    width: '100%',
  },
  summaryCopy: {
    display: 'grid',
    flex: '1 1 auto',
    gap: spacing[1],
    minWidth: 0,
  },
  summaryStatus: {
    flexShrink: 0,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    lineHeight: 1.3,
    marginLeft: 'auto',
    whiteSpace: 'nowrap',
  },
  summarySubtitle: {
    fontSize: fontSize.xs,
    lineHeight: 1.4,
    margin: 0,
    overflowWrap: 'anywhere',
  },
  summaryTitle: {
    flex: '1 1 auto',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    lineHeight: 1.3,
    margin: 0,
    minWidth: 0,
    overflowWrap: 'anywhere',
  },
  summaryTitleRow: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing[2],
    minWidth: 0,
    width: '100%',
  },
} satisfies Record<string, SxProps<Theme>>;
