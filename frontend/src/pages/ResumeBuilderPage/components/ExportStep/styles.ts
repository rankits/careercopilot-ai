import { Box, styled } from '@/lib/material';
import { borderRadius, colorTokens, fontSize, fontWeight, spacing } from '@/tokens';

export const ExportLayout = styled(Box)({
  display: 'grid',
  gap: spacing[5],
  gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 0.95fr)',
  alignItems: 'start',
  minWidth: 0,
  overflowX: 'hidden',
  padding: 0,
  width: '100%',
  '@media (max-width: 1100px)': {
    gridTemplateColumns: '1fr',
  },
  '@media (max-width: 48rem)': {
    gap: spacing[3],
    padding: 0,
  },
});

export const CongratsBanner = styled(Box)({
  display: 'flex',
  gap: spacing[4],
  alignItems: 'flex-start',
  padding: spacing[5],
  marginBottom: spacing[5],
  borderRadius: borderRadius.xl,
  background: `linear-gradient(135deg, ${colorTokens.actionPrimarySurface} 0%, ${colorTokens.backgroundCard} 100%)`,
  border: `1px solid ${colorTokens.borderDefault}`,
  '& .icon': {
    display: 'grid',
    placeItems: 'center',
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    background: colorTokens.actionPrimary,
    color: colorTokens.textInverse,
    flexShrink: 0,
  },
  '& .title': {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semiBold,
    color: colorTokens.textPrimary,
    marginBottom: spacing[1],
  },
  '& .text': {
    fontSize: fontSize.sm,
    color: colorTokens.textSecondary,
    lineHeight: 1.5,
  },
});

export const ScoreGrid = styled(Box)({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: spacing[3],
  marginBottom: spacing[5],
  '@media (max-width: 700px)': {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
  '& .score-card': {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    border: `1px solid ${colorTokens.borderDefault}`,
    background: colorTokens.backgroundCard,
  },
  '& .score-card.highlight': {
    borderColor: colorTokens.actionPrimary,
    background: colorTokens.actionPrimarySurface,
  },
  '& .label': {
    fontSize: fontSize.xs,
    color: colorTokens.textSecondary,
    marginBottom: spacing[1],
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  '& .value': {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colorTokens.textPrimary,
  },
  '& .value.positive': {
    color: colorTokens.feedbackSuccess,
  },
});

export const ExportPreviewCard = styled(Box)({
  position: 'sticky',
  top: spacing[4],
  padding: spacing[4],
  borderRadius: borderRadius.xl,
  border: `1px solid ${colorTokens.borderDefault}`,
  background: colorTokens.backgroundCard,
  maxHeight: 'calc(100vh - 120px)',
  maxWidth: '100%',
  minWidth: 0,
  overflow: 'auto',
  '@media (max-width: 1100px)': {
    maxHeight: 'none',
    position: 'relative',
    top: 0,
  },
  '& .preview-title': {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semiBold,
    color: colorTokens.textSecondary,
    marginBottom: spacing[3],
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
});

/** Desktop: one row. Tablet/mobile: responsive 2-col grid so actions never overflow. */
export const ExportActions = styled(Box)({
  display: 'flex',
  flexWrap: 'nowrap',
  alignItems: 'center',
  gap: spacing[3],
  marginBottom: spacing[5],
  width: '100%',
  '& > *': {
    flex: '1 1 0',
    minWidth: 0,
  },
  '@media (max-width: 900px)': {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: spacing[3],
    '& > *': {
      flex: 'unset',
      width: '100%',
    },
  },
  '@media (max-width: 28rem)': {
    gridTemplateColumns: '1fr',
  },
});
