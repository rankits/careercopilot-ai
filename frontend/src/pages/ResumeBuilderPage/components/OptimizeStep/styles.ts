import { Box, Typography, styled } from '@/lib/material';
import { colorTokens, fontSize, fontWeight, spacing } from '@/tokens';

import {
  border,
  borderRadius,
  iconBox,
  muted,
  panel,
  pill,
  stepPadding,
  t,
  title,
  tone,
} from '../../styles/shared';

export const OptimizeShell = styled(Box)({
  display: 'grid',
  gap: spacing[4],
  gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 0.95fr)',
  minWidth: 0,
  overflowX: 'hidden',
  width: '100%',
  ...stepPadding,
  '@media (max-width: 76rem)': {
    gridTemplateColumns: '1fr',
  },
  '@media (max-width: 48rem)': {
    gap: spacing[3],
    '& > *': { minWidth: 0, maxWidth: '100%' },
  },
});

export const OptimizeMain = styled(Box)({
  ...panel,
  background: colorTokens.backgroundCard,
  boxSizing: 'border-box',
  gap: spacing[4],
  maxWidth: '100%',
  minWidth: 0,
  overflowX: 'hidden',
  width: '100%',
  '@media (max-width: 48rem)': {
    gap: spacing[3],
    padding: spacing[3],
  },
});

export const OptimizeHeader = styled(Box)({
  display: 'grid',
  gap: spacing[2],

  '& .title': {
    ...title,
    fontSize: fontSize['2xl'],
    lineHeight: 1.2,
  },
  '& .subtitle': muted,
});

export const ScoreStrip = styled(Box)({
  alignItems: 'center',
  background: `linear-gradient(135deg, ${t.primarySofter}, ${colorTokens.backgroundCard})`,
  border,
  borderRadius: borderRadius['2xl'],
  display: 'grid',
  gap: spacing[3],
  gridTemplateColumns: 'auto auto minmax(0, 1fr) auto',
  minWidth: 0,
  padding: spacing[4],
  width: '100%',
  '@media (max-width: 64rem)': {
    gridTemplateColumns: 'auto auto minmax(0, 1fr)',
    '& > :last-child': { gridColumn: '1 / -1' },
  },
  '@media (max-width: 48rem)': {
    gridTemplateColumns: '1fr',
  },

  '& .label': { ...muted, fontSize: fontSize.xs },
  '& .current': {
    color: colorTokens.feedbackError,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.extraBold,
  },
  '& .improved': {
    color: tone.success.color,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.extraBold,
  },
  '& .badge': {
    ...pill,
    background: tone.success.background,
    border: `1px solid ${tone.success.border}`,
    color: tone.success.color,
    justifySelf: 'start',
  },
});

export const OptimizeLayout = styled(Box)({
  display: 'grid',
  gap: spacing[4],
  gridTemplateColumns: 'minmax(0, 14.5rem) minmax(0, 1fr)',
  maxWidth: '100%',
  minWidth: 0,
  overflowX: 'clip',
  width: '100%',
  '@media (max-width: 64rem)': {
    gridTemplateColumns: '1fr',
  },
  '@media (max-width: 48rem)': {
    gap: spacing[3],
  },
});

export const SectionNav = styled(Box)({
  border,
  borderRadius: borderRadius['2xl'],
  display: 'grid',
  gap: spacing[2],
  height: 'fit-content',
  minWidth: 0,
  padding: spacing[3],

  '& .nav-title': {
    color: t.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.extraBold,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },

  '@media (max-width: 64rem)': {
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing[2],
    '& .nav-title': { width: '100%' },
  },
});

export const SectionNavButton = styled('button', {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>(({ active = false }) => ({
  alignItems: 'center',
  background: active ? t.primarySofter : colorTokens.backgroundCard,
  border: active ? `1px solid color-mix(in srgb, ${t.primary} 35%, transparent)` : border,
  borderRadius: borderRadius.lg,
  color: active ? t.primary : t.text,
  cursor: 'pointer',
  display: 'flex',
  fontFamily: 'inherit',
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semiBold,
  gap: spacing[2],
  justifyContent: 'space-between',
  maxWidth: '100%',
  minHeight: '2.75rem',
  minWidth: 0,
  padding: `${spacing[2]} ${spacing[3]}`,
  textAlign: 'left',
  transition: 'background 140ms ease, border-color 140ms ease, color 140ms ease',
  '@media (max-width: 64rem)': {
    flex: '1 1 auto',
  },
  '&:hover': {
    background: t.primarySofter,
    borderColor: 'rgba(37, 99, 235, 0.28)',
  },
  '& .count': {
    ...pill,
    background: active ? t.primary : colorTokens.actionPrimarySubtle,
    color: active ? colorTokens.textInverse : t.primary,
    fontSize: '0.65rem',
    minWidth: '1.4rem',
    justifyContent: 'center',
    padding: '0.2rem 0.4rem',
  },
}));

export const EditorCard = styled(Box)({
  border,
  borderRadius: borderRadius['2xl'],
  boxSizing: 'border-box',
  display: 'grid',
  gap: spacing[3],
  gridTemplateRows: 'auto minmax(0, auto) minmax(0, 1fr) auto',
  maxWidth: '100%',
  minWidth: 0,
  overflow: 'hidden',
  padding: spacing[4],
  width: '100%',
  '@media (max-width: 48rem)': {
    padding: spacing[3],
  },

  '& .section-title-row': {
    alignItems: 'flex-start',
    display: 'flex',
    gap: spacing[3],
    justifyContent: 'space-between',
    maxWidth: '100%',
    minWidth: 0,
    '@media (max-width: 40rem)': {
      flexDirection: 'column',
      '& > button': {
        width: '100%',
      },
    },
  },
  '& .section-title': {
    ...title,
    fontSize: fontSize.xl,
    lineHeight: 1.25,
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
  },
  '& .section-tip': {
    ...muted,
    fontSize: fontSize.sm,
    marginTop: spacing[1],
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
  },
});

export const SuggestionList = styled(Box)({
  boxSizing: 'border-box',
  display: 'grid',
  gap: spacing[3],
  alignContent: 'start',
  maxHeight: 'min(24rem, 45vh)',
  maxWidth: '100%',
  minHeight: 0,
  minWidth: 0,
  overflowX: 'hidden',
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  paddingRight: spacing[1],
  scrollbarColor: `${t.textMuted} transparent`,
  scrollbarWidth: 'thin',
  width: '100%',
  '@media (max-width: 48rem)': {
    maxHeight: 'min(28rem, 50vh)',
  },
});

export const SuggestionCard = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'selected',
})<{ selected?: boolean }>(({ selected = false }) => ({
  background: selected
    ? `linear-gradient(135deg, ${t.primarySofter}, ${colorTokens.backgroundCard})`
    : colorTokens.backgroundCard,
  border: selected ? `1.5px solid ${t.primary}` : border,
  borderRadius: borderRadius.xl,
  boxShadow: selected ? t.purpleShadow : 'none',
  boxSizing: 'border-box',
  display: 'grid',
  gap: spacing[3],
  maxWidth: '100%',
  minWidth: 0,
  overflow: 'hidden',
  padding: spacing[4],
  transition: 'border-color 140ms ease, box-shadow 140ms ease, background 140ms ease',
  width: '100%',
  '@media (max-width: 48rem)': {
    gap: spacing[2],
    padding: spacing[3],
  },
}));

export const SuggestionMeta = styled(Box)({
  alignItems: 'flex-start',
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing[2],
  justifyContent: 'space-between',
  maxWidth: '100%',
  minWidth: 0,

  '& .title': {
    ...title,
    flex: '1 1 10rem',
    fontSize: fontSize.sm,
    lineHeight: 1.35,
    maxWidth: '100%',
    minWidth: 0,
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
  },

  '@media (max-width: 40rem)': {
    alignItems: 'stretch',
    flexDirection: 'column',
  },
});

export const SuggestionReason = styled(Typography)({
  ...muted,
  background: t.primarySofter,
  borderLeft: `3px solid ${t.primary}`,
  borderRadius: `0 ${borderRadius.md} ${borderRadius.md} 0`,
  boxSizing: 'border-box',
  fontSize: fontSize.xs,
  lineHeight: 1.5,
  maxHeight: '4.5rem',
  maxWidth: '100%',
  minWidth: 0,
  overflowWrap: 'anywhere',
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  padding: `${spacing[2]} ${spacing[3]}`,
  scrollbarWidth: 'thin',
  wordBreak: 'break-word',
});

export const ImpactPill = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'impact',
})<{ impact: 'HIGH' | 'MEDIUM' | 'LOW' }>(({ impact }) => {
  const colors = impact === 'HIGH' ? tone.error : impact === 'MEDIUM' ? tone.warning : tone.success;
  return {
    ...pill,
    background: colors.background,
    border: `1px solid ${colors.border}`,
    color: colors.color,
    flexShrink: 0,
    maxWidth: '100%',
    '@media (max-width: 40rem)': {
      alignSelf: 'flex-start',
      fontSize: '0.65rem',
      padding: `${spacing[1]} ${spacing[2]}`,
    },
  };
});

export const DiffBlock = styled(Box)({
  display: 'grid',
  gap: spacing[3],
  gridTemplateColumns: '1fr 1fr',
  maxWidth: '100%',
  minWidth: 0,
  width: '100%',
  '@media (max-width: 64rem)': {
    gridTemplateColumns: '1fr',
  },

  '& .pane': {
    borderRadius: borderRadius.lg,
    boxSizing: 'border-box',
    display: 'grid',
    gap: spacing[2],
    gridTemplateRows: 'auto minmax(0, 1fr)',
    maxHeight: '11rem',
    maxWidth: '100%',
    minWidth: 0,
    overflow: 'hidden',
    padding: spacing[3],
  },
  '& .before': {
    background: colorTokens.feedbackErrorSurface,
    border: `1px solid ${colorTokens.feedbackError}`,
    color: colorTokens.feedbackError,
  },
  '& .after': {
    background: colorTokens.feedbackSuccessSurface,
    border: `1px solid ${colorTokens.feedbackSuccess}`,
    color: colorTokens.feedbackSuccess,
  },
  '& .label': {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.extraBold,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  '& .body': {
    fontSize: fontSize.sm,
    lineHeight: 1.55,
    maxWidth: '100%',
    minHeight: 0,
    minWidth: 0,
    overflowWrap: 'anywhere',
    overflowX: 'hidden',
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    scrollbarWidth: 'thin',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
});

export const EditorArea = styled('textarea')({
  background: colorTokens.backgroundCard,
  border,
  borderRadius: borderRadius.xl,
  boxSizing: 'border-box',
  color: t.text,
  fontFamily: 'inherit',
  fontSize: fontSize.sm,
  height: '12rem',
  lineHeight: 1.65,
  maxHeight: '12rem',
  maxWidth: '100%',
  minWidth: 0,
  overflowY: 'auto',
  padding: spacing[4],
  resize: 'none',
  width: '100%',
  '&:focus': {
    borderColor: t.primary,
    boxShadow: `0 0 0 3px color-mix(in srgb, ${t.primary} 12%, transparent)`,
    outline: 'none',
  },
});

export const ActionBar = styled(Box)({
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing[2],
  justifyContent: 'flex-end',
  maxWidth: '100%',
  minWidth: 0,
  width: '100%',
  '& > button': {
    flex: '0 1 auto',
    maxWidth: '100%',
    minWidth: 0,
  },
  '@media (max-width: 40rem)': {
    display: 'grid',
    gap: spacing[2],
    gridTemplateColumns: '1fr',
    justifyContent: 'stretch',
    '& > button': {
      width: '100%',
    },
  },
});

export const EditorFooterBar = styled(ActionBar)({
  background: colorTokens.backgroundCard,
  borderTop: border,
  justifyContent: 'flex-start',
  marginTop: spacing[1],
  paddingTop: spacing[3],
  position: 'sticky',
  bottom: 0,
  zIndex: 1,
  '@media (max-width: 40rem)': {
    display: 'flex',
    gridTemplateColumns: 'unset',
  },
});

export const PreviewPanel = styled(Box)({
  ...panel,
  alignSelf: 'start',
  background: colorTokens.backgroundCard,
  gap: spacing[3],
  maxHeight: 'calc(100vh - 8rem)',
  overflowY: 'auto',
  padding: spacing[5],
  position: 'sticky',
  top: spacing[4],
  '@media (max-width: 76rem)': {
    maxHeight: 'none',
    position: 'relative',
    top: 0,
  },

  '& .preview-header': {
    alignItems: 'flex-start',
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing[3],
    justifyContent: 'space-between',
    maxWidth: '100%',
    minWidth: 0,
    '@media (max-width: 40rem)': {
      flexDirection: 'column',
      '& > button': {
        width: '100%',
      },
    },
  },
  '& .preview-title': {
    ...title,
    fontSize: fontSize.base,
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
  },
  '& .preview-meta': {
    ...muted,
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
  },
});

export const PreviewPaper = styled(Box)({
  background: `linear-gradient(180deg, ${colorTokens.backgroundCard} 0%, ${t.primarySofter} 140%)`,
  border,
  borderRadius: borderRadius['2xl'],
  color: t.text,
  display: 'grid',
  gap: spacing[4],
  maxHeight: '42rem',
  minHeight: '28rem',
  overflowY: 'auto',
  padding: spacing[6],
  scrollbarColor: `${t.textMuted} transparent`,
  scrollbarWidth: 'thin',

  '& .name': {
    ...title,
    fontSize: fontSize['3xl'],
    lineHeight: 1.1,
  },
  '& .role': {
    color: t.primary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.extraBold,
  },
  '& .contact': {
    ...muted,
    display: 'flex',
    flexWrap: 'wrap',
    fontSize: fontSize.xs,
    gap: spacing[3],
  },
  '& .section': {
    display: 'grid',
    gap: spacing[2],
  },
  '& .section-title': {
    borderBottom: `1px solid color-mix(in srgb, ${t.primary} 18%, transparent)`,
    color: t.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.extraBold,
    letterSpacing: '0.06em',
    paddingBottom: spacing[1],
    textTransform: 'uppercase',
  },
  '& .section-body': {
    fontSize: fontSize.sm,
    lineHeight: 1.65,
    whiteSpace: 'pre-wrap',
  },
  '& .skills': {
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  '& .skill': {
    background: t.primarySoft,
    borderRadius: borderRadius.full,
    color: t.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    padding: `${spacing[1]} ${spacing[3]}`,
  },
});

export const EmptyHint = styled(Typography)({
  ...muted,
  background: t.primarySofter,
  borderRadius: borderRadius.lg,
  boxSizing: 'border-box',
  maxWidth: '100%',
  minWidth: 0,
  overflowWrap: 'anywhere',
  padding: spacing[4],
  textAlign: 'center',
  width: '100%',
  wordBreak: 'break-word',
  '& > span': {
    display: 'inline-flex',
    flexWrap: 'wrap',
    gap: spacing[1],
    justifyContent: 'center',
    maxWidth: '100%',
  },
  '@media (max-width: 48rem)': {
    padding: spacing[3],
  },
});

export const AiBanner = styled(Box)({
  alignItems: 'flex-start',
  background: `linear-gradient(135deg, ${t.primarySoft}, ${colorTokens.backgroundCard})`,
  border: '1px solid rgba(37, 99, 235, 0.2)',
  borderRadius: borderRadius['2xl'],
  boxSizing: 'border-box',
  display: 'grid',
  gap: spacing[4],
  gridTemplateColumns: 'auto minmax(0, 1fr)',
  maxWidth: '100%',
  minWidth: 0,
  overflow: 'hidden',
  padding: spacing[4],
  width: '100%',
  '@media (max-width: 48rem)': {
    gap: spacing[3],
    gridTemplateColumns: '1fr',
    padding: spacing[3],
    '& .icon': {
      height: '2.25rem',
      width: '2.25rem',
    },
  },

  '& .icon': iconBox('2.75rem'),
  '& .title': {
    color: t.primaryHover,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
  },
  '& .text': {
    ...muted,
    fontSize: fontSize.xs,
    lineHeight: 1.55,
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
  },
  '& .actions': {
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[2],
    maxWidth: '100%',
    minWidth: 0,
    '& > button': {
      flex: '1 1 auto',
      maxWidth: '100%',
      minWidth: 0,
    },
    '@media (max-width: 40rem)': {
      display: 'grid',
      gridTemplateColumns: '1fr',
      '& > button': {
        width: '100%',
      },
    },
  },
});
