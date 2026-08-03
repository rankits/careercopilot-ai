import { Accordion, Box, styled, type SxProps, type Theme } from '@/lib/material';
import { borderRadius, borderWidth, colorTokens, spacing } from '@/tokens';

export const StyledAccordion = styled(Accordion)({
  background: colorTokens.backgroundCard,
  border: `${borderWidth.thin} solid ${colorTokens.borderSubtle}`,
  borderRadius: `${borderRadius.xl} !important`,
  boxShadow: 'none',
  overflow: 'hidden',
  '&::before': { display: 'none' },
});

export const ReviewFields = styled(Box)(({ theme }) => ({
  display: 'grid',
  gap: spacing[4],
  gridTemplateColumns: 'minmax(0, 1fr)',
  [theme.breakpoints.up('sm')]: {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
}));

export const reviewSectionSx = {
  details: {
    borderTop: `${borderWidth.thin} solid ${colorTokens.borderSubtle}`,
    p: spacing[4],
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
    '& .MuiFormLabel-asterisk': {
      color: colorTokens.feedbackError,
    },
  },
  multilineInput: {
    '& .MuiFormLabel-asterisk': {
      color: colorTokens.feedbackError,
    },
    gridColumn: '1 / -1',
  },
  summary: {
    minHeight: spacing[14],
    px: spacing[4],
  },
} satisfies Record<string, SxProps<Theme>>;
