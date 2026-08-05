import { Box, CircularProgress, styled } from '@/lib/material';
import { borderRadius, colorTokens, fontSize, fontWeight, spacing } from '@/tokens';

export const Root = styled(Box)({
  display: 'grid',
  gap: spacing[4],
  margin: '0 auto',
  maxWidth: '72rem',
  paddingBottom: spacing[8],
  width: '100%',
  '@media (max-width: 48rem)': {
    gap: spacing[3],
    paddingInline: spacing[1],
  },
});

export const PageHeader = styled(Box)({
  alignItems: 'flex-start',
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing[3],
  justifyContent: 'space-between',
});

export const Toolbar = styled(Box)({
  alignItems: 'center',
  display: 'grid',
  gap: spacing[3],
  gridTemplateColumns: 'minmax(0, 1fr) auto auto',
  minWidth: 0,
  '@media (max-width: 64rem)': {
    gridTemplateColumns: '1fr 1fr',
  },
  '@media (max-width: 40rem)': {
    gridTemplateColumns: '1fr',
  },
});

export const SearchField = styled(Box)({
  alignItems: 'center',
  background: colorTokens.backgroundCard,
  border: `1px solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.lg,
  display: 'flex',
  gap: spacing[2],
  minWidth: 0,
  padding: `${spacing[2]} ${spacing[3]}`,
  '& input': {
    background: 'transparent',
    border: 0,
    color: colorTokens.textPrimary,
    flex: 1,
    fontSize: fontSize.sm,
    minWidth: 0,
    outline: 'none',
    width: '100%',
  },
});

export const ToolbarButton = styled('button')({
  alignItems: 'center',
  background: colorTokens.backgroundCard,
  border: `1px solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.lg,
  color: colorTokens.textPrimary,
  cursor: 'pointer',
  display: 'inline-flex',
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semiBold,
  gap: spacing[1],
  padding: `${spacing[2]} ${spacing[3]}`,
  whiteSpace: 'nowrap',
});

export const TotalBadge = styled(Box)({
  alignItems: 'center',
  background: colorTokens.actionPrimarySurface,
  border: `1px solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.lg,
  color: colorTokens.textSecondary,
  display: 'inline-flex',
  fontSize: fontSize.xs,
  fontWeight: fontWeight.semiBold,
  gap: spacing[2],
  justifySelf: 'end',
  padding: `${spacing[2]} ${spacing[3]}`,
  whiteSpace: 'nowrap',
  '@media (max-width: 64rem)': {
    justifySelf: 'stretch',
  },
});

/** 3×3 on desktop so one page shows 9 cards. */
export const VersionsGrid = styled(Box)({
  alignItems: 'start',
  display: 'grid',
  gap: spacing[3],
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  '@media (max-width: 72rem)': {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
  '@media (max-width: 48rem)': {
    gridTemplateColumns: '1fr',
  },
});

export const VersionCard = styled(Box)({
  alignContent: 'start',
  alignSelf: 'start',
  background: colorTokens.backgroundCard,
  border: `1px solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.xl,
  display: 'grid',
  gap: spacing[2],
  minWidth: 0,
  overflow: 'visible',
  padding: spacing[3],
  width: '100%',
});

export const CardTop = styled(Box)({
  alignItems: 'flex-start',
  display: 'grid',
  gap: spacing[2],
  gridTemplateColumns: 'auto minmax(0, 1fr) 3.5rem',
  minWidth: 0,
});

export const Thumb = styled(Box)({
  background: `linear-gradient(180deg, ${colorTokens.actionPrimarySurface} 0%, ${colorTokens.backgroundApp} 100%)`,
  border: `1px solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.md,
  boxSizing: 'border-box',
  flexShrink: 0,
  height: '3.5rem',
  overflow: 'hidden',
  padding: '0.35rem',
  width: '2.5rem',
  '& .line': {
    background: colorTokens.borderDefault,
    borderRadius: 2,
    height: 2,
    marginBottom: 3,
  },
});

export const ScoreRing = styled(Box)({
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  gap: 2,
  justifyContent: 'flex-start',
  width: '3.5rem',
  '& .score-circle': {
    display: 'grid',
    height: 44,
    placeItems: 'center',
    position: 'relative',
    width: 44,
  },
  '& .score-track, & .score-progress': {
    left: 0,
    position: 'absolute',
    top: 0,
  },
  '& .score-value': {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
    lineHeight: 1,
    position: 'relative',
    zIndex: 1,
  },
  '& .score-label': {
    fontSize: '0.6rem',
    fontWeight: fontWeight.semiBold,
    lineHeight: 1.1,
    maxWidth: '100%',
    overflow: 'hidden',
    textAlign: 'center',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});

export const StatusRow = styled(Box)({
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing[2],
  '& .status': {
    color: colorTokens.feedbackSuccess,
    fontSize: '0.7rem',
    fontWeight: fontWeight.semiBold,
  },
});

export const JdSection = styled(Box)({
  display: 'grid',
  gap: 2,
  minWidth: 0,
});

export const JdBlock = styled(Box)({
  alignItems: 'center',
  color: colorTokens.textSecondary,
  display: 'flex',
  fontSize: fontSize.xs,
  gap: spacing[1],
  lineHeight: 1.35,
  minHeight: '1.35em',
  minWidth: 0,
  width: '100%',
  '& .jd-line': {
    display: 'block',
    flex: '1 1 auto',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  '& .read-more': {
    background: 'none',
    border: 0,
    color: colorTokens.actionPrimary,
    cursor: 'pointer',
    flex: '0 0 auto',
    font: 'inherit',
    fontWeight: fontWeight.semiBold,
    padding: 0,
    whiteSpace: 'nowrap',
  },
});

export const MetricsRow = styled(Box)({
  borderTop: `1px solid ${colorTokens.borderDefault}`,
  display: 'grid',
  gap: spacing[1],
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  paddingTop: spacing[2],
  textAlign: 'center',
  '& .metric-label': {
    color: colorTokens.textSecondary,
    fontSize: '0.62rem',
    fontWeight: fontWeight.medium,
  },
  '& .metric-value': {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});

export const CardActions = styled(Box)({
  borderTop: `1px solid ${colorTokens.borderDefault}`,
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing[1],
  paddingTop: spacing[2],
});

export const ActionChip = styled('button')({
  alignItems: 'center',
  background: colorTokens.actionPrimarySurface,
  border: `1px solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.md,
  color: colorTokens.actionPrimary,
  cursor: 'pointer',
  display: 'inline-flex',
  fontSize: '0.7rem',
  fontWeight: fontWeight.semiBold,
  gap: spacing[1],
  padding: `0.25rem ${spacing[2]}`,
  '&:disabled': {
    cursor: 'not-allowed',
    opacity: 0.6,
  },
});

export const Pagination = styled(Box)({
  alignItems: 'center',
  display: 'flex',
  gap: spacing[2],
  justifyContent: 'center',
  paddingTop: spacing[2],
});

export const PageButton = styled('button')<{ active?: boolean }>(({ active }) => ({
  alignItems: 'center',
  background: active ? colorTokens.actionPrimary : colorTokens.backgroundCard,
  border: `1px solid ${active ? colorTokens.actionPrimary : colorTokens.borderDefault}`,
  borderRadius: borderRadius.md,
  color: active ? colorTokens.textInverse : colorTokens.textPrimary,
  cursor: 'pointer',
  display: 'inline-flex',
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semiBold,
  height: '2.25rem',
  justifyContent: 'center',
  minWidth: '2.25rem',
  padding: `0 ${spacing[2]}`,
}));

export const EmptyState = styled(Box)({
  alignItems: 'center',
  border: `1px dashed ${colorTokens.borderDefault}`,
  borderRadius: borderRadius['2xl'],
  display: 'grid',
  gap: spacing[3],
  justifyItems: 'center',
  padding: `${spacing[10]} ${spacing[5]}`,
  textAlign: 'center',
});

export { CircularProgress };
