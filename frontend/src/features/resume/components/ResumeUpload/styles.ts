import { Box, styled, type SxProps, type Theme } from '@/lib/material';
import { borderRadius, borderWidth, colorTokens, shadows, spacing } from '@/tokens';

export const UploadCard = styled(Box)({
  background: colorTokens.backgroundCard,
  border: `${borderWidth.thin} solid ${colorTokens.borderSubtle}`,
  borderRadius: borderRadius.xl,
  boxShadow: shadows.card,
  overflow: 'hidden',
});

export const DropZone = styled(Box, {
  shouldForwardProp: (property) => property !== 'active' && property !== 'hasError',
})<{ active: boolean; hasError: boolean }>(({ active, hasError, theme }) => ({
  alignItems: 'center',
  background: hasError
    ? colorTokens.feedbackErrorSurface
    : active
      ? colorTokens.actionPrimarySubtle
      : colorTokens.actionPrimarySurface,
  border: `${borderWidth.thin} dashed ${
    hasError
      ? colorTokens.feedbackError
      : active
        ? colorTokens.actionPrimary
        : colorTokens.borderDefault
  }`,
  borderRadius: borderRadius.xl,
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  gap: spacing[3],
  justifyContent: 'center',
  margin: spacing[5],
  minHeight: '11rem',
  padding: spacing[5],
  textAlign: 'center',
  transition: theme.transitions.create(['background-color', 'border-color', 'transform']),
  '&:focus-visible': { boxShadow: shadows.focus, outline: 'none' },
  '&:hover': { borderColor: hasError ? colorTokens.feedbackError : colorTokens.borderHover },
}));

export const ParsedLayout = styled(Box)(({ theme }) => ({
  display: 'grid',
  gap: 0,
  gridTemplateColumns: 'minmax(0, 1fr)',
  [theme.breakpoints.up('md')]: {
    gridTemplateColumns: 'minmax(18rem, 0.85fr) minmax(28rem, 1.65fr)',
  },
}));

export const FilePanel = styled(Box)(({ theme }) => ({
  alignItems: 'center',
  display: 'grid',
  gap: spacing[4],
  gridTemplateColumns: 'auto minmax(0, 1fr)',
  padding: spacing[5],
  [theme.breakpoints.up('md')]: {
    borderRight: `${borderWidth.thin} solid ${colorTokens.borderSubtle}`,
  },
}));

export const FileIcon = styled(Box)({
  alignItems: 'center',
  background: colorTokens.actionPrimarySubtle,
  borderRadius: borderRadius.lg,
  color: colorTokens.actionPrimary,
  display: 'flex',
  height: spacing[16],
  justifyContent: 'center',
  width: spacing[16],
});

export const HiddenInput = styled('input')({
  height: 1,
  opacity: 0,
  overflow: 'hidden',
  position: 'absolute',
  width: 1,
});

export const resumeUploadSx = {
  removeButton: {
    flexShrink: 0,
  },
} satisfies Record<string, SxProps<Theme>>;
