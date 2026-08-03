import { Box, Typography, styled } from '@/lib/material';
import { colorTokens, fontSize, fontWeight, spacing } from '@/tokens';

import {
  border,
  borderRadius,
  iconBox,
  muted,
  panel,
  pill,
  t,
  title,
  tone,
} from '../../styles/shared';

export const OptimizeShell = styled(Box)({
  display: 'grid',
  gap: spacing[4],
  gridTemplateColumns: 'minmax(0, 1.05fr) minmax(20rem, 0.95fr)',
  padding: `${spacing[4]} ${spacing[6]} ${spacing[6]}`,
  '@media (max-width: 76rem)': {
    gridTemplateColumns: '1fr',
  },
  '@media (max-width: 48rem)': {
    gap: spacing[3],
    padding: `${spacing[3]} ${spacing[3]} ${spacing[5]}`,
  },
});

export const OptimizeMain = styled(Box)({
  ...panel,
  background: colorTokens.backgroundCard,
  gap: spacing[4],
  minWidth: 0,
  padding: spacing[5],
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
  gap: spacing[4],
  gridTemplateColumns: '1fr auto 1fr auto',
  padding: spacing[4],
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
  gridTemplateColumns: '14.5rem minmax(0, 1fr)',
  '@media (max-width: 64rem)': {
    gridTemplateColumns: '1fr',
  },
});

export const SectionNav = styled(Box)({
  border,
  borderRadius: borderRadius['2xl'],
  display: 'grid',
  gap: spacing[2],
  height: 'fit-content',
  padding: spacing[3],

  '& .nav-title': {
    color: t.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.extraBold,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
});

export const SectionNavButton = styled('button', {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>(({ active = false }) => ({
  alignItems: 'center',
  background: active ? t.primarySofter : colorTokens.backgroundCard,
  border: active ? `1px solid rgba(124,58,237,0.35)` : border,
  borderRadius: borderRadius.lg,
  color: active ? t.primary : t.text,
  cursor: 'pointer',
  display: 'flex',
  fontFamily: 'inherit',
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semiBold,
  gap: spacing[2],
  justifyContent: 'space-between',
  minHeight: '2.75rem',
  padding: `${spacing[2]} ${spacing[3]}`,
  textAlign: 'left',
  transition: 'background 140ms ease, border-color 140ms ease, color 140ms ease',
  '&:hover': {
    background: t.primarySofter,
    borderColor: 'rgba(124,58,237,0.28)',
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
  display: 'grid',
  gap: spacing[4],
  minWidth: 0,
  padding: spacing[4],

  '& .section-title-row': {
    alignItems: 'flex-start',
    display: 'flex',
    gap: spacing[3],
    justifyContent: 'space-between',
    '@media (max-width: 40rem)': {
      flexDirection: 'column',
    },
  },
  '& .section-title': {
    ...title,
    fontSize: fontSize.xl,
    lineHeight: 1.25,
  },
  '& .section-tip': {
    ...muted,
    fontSize: fontSize.sm,
    marginTop: spacing[1],
  },
});

export const SuggestionList = styled(Box)({
  display: 'grid',
  gap: spacing[3],
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
  display: 'grid',
  gap: spacing[3],
  padding: spacing[4],
  transition: 'border-color 140ms ease, box-shadow 140ms ease, background 140ms ease',
}));

export const SuggestionMeta = styled(Box)({
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing[2],
  justifyContent: 'space-between',

  '& .title': {
    ...title,
    fontSize: fontSize.sm,
  },
});

export const SuggestionReason = styled(Typography)({
  ...muted,
  background: t.primarySofter,
  borderLeft: `3px solid ${t.primary}`,
  borderRadius: `0 ${borderRadius.md} ${borderRadius.md} 0`,
  fontSize: fontSize.xs,
  lineHeight: 1.5,
  padding: `${spacing[2]} ${spacing[3]}`,
});

export const ImpactPill = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'impact',
})<{ impact: 'HIGH' | 'MEDIUM' | 'LOW' }>(({ impact }) => {
  const colors =
    impact === 'HIGH' ? tone.error : impact === 'MEDIUM' ? tone.warning : tone.success;
  return {
    ...pill,
    background: colors.background,
    border: `1px solid ${colors.border}`,
    color: colors.color,
  };
});

export const DiffBlock = styled(Box)({
  display: 'grid',
  gap: spacing[3],
  gridTemplateColumns: '1fr 1fr',
  '@media (max-width: 48rem)': {
    gridTemplateColumns: '1fr',
  },

  '& .pane': {
    borderRadius: borderRadius.lg,
    display: 'grid',
    gap: spacing[2],
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
    whiteSpace: 'pre-wrap',
  },
});

export const EditorArea = styled('textarea')({
  background: colorTokens.backgroundCard,
  border,
  borderRadius: borderRadius.xl,
  color: t.text,
  fontFamily: 'inherit',
  fontSize: fontSize.sm,
  lineHeight: 1.65,
  minHeight: '12rem',
  padding: spacing[4],
  resize: 'vertical',
  width: '100%',
  '&:focus': {
    borderColor: t.primary,
    boxShadow: `0 0 0 3px rgba(124,58,237,0.12)`,
    outline: 'none',
  },
});

export const ActionBar = styled(Box)({
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing[3],
  justifyContent: 'space-between',
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
    gap: spacing[3],
    justifyContent: 'space-between',
  },
  '& .preview-title': {
    ...title,
    fontSize: fontSize.base,
  },
  '& .preview-meta': muted,
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
    borderBottom: `1px solid rgba(124,58,237,0.18)`,
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
  padding: spacing[4],
  textAlign: 'center',
});

export const AiBanner = styled(Box)({
  alignItems: 'center',
  background: `linear-gradient(135deg, ${t.primarySoft}, ${colorTokens.backgroundCard})`,
  border: '1px solid rgba(124,58,237,0.2)',
  borderRadius: borderRadius['2xl'],
  display: 'grid',
  gap: spacing[4],
  gridTemplateColumns: 'auto minmax(0, 1fr) auto',
  padding: spacing[4],
  '@media (max-width: 48rem)': {
    gridTemplateColumns: 'auto minmax(0, 1fr)',
  },

  '& .icon': iconBox('2.75rem'),
  '& .title': {
    color: t.primaryHover,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
  },
  '& .text': {
    ...muted,
    fontSize: fontSize.xs,
    lineHeight: 1.55,
  },
});
