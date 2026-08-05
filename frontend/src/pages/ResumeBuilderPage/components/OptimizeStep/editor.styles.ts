import { Box, Typography, styled } from '@/lib/material';
import { colorTokens, fontSize, fontWeight, spacing } from '@/tokens';

import { border, borderRadius, muted, scrollableMultilineSx, t, title } from '../../styles/shared';

export { scrollableMultilineSx };

export const SectionEditorShell = styled(Box)({
  display: 'grid',
  gap: spacing[3],
  minWidth: 0,
});

export const ScrollableEntries = styled(Box)({
  display: 'grid',
  gap: spacing[3],
  maxHeight: '22rem',
  minWidth: 0,
  overflowX: 'hidden',
  overflowY: 'auto',
  paddingRight: spacing[1],
  scrollbarWidth: 'thin',
});

export const FieldLabel = styled(Typography)({
  color: t.textSecondary,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.extraBold,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
});

export const ChipInputRow = styled(Box)({
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing[2],
  maxWidth: '100%',
  minHeight: '2.5rem',
  minWidth: 0,
});

/** Plain text skill suggestions — not chip pills. */
export const SkillSuggestionRow = styled(Box)({
  display: 'flex',
  flexWrap: 'wrap',
  gap: `${spacing[1]} ${spacing[2]}`,
  maxWidth: '100%',
  minWidth: 0,
  '& button': {
    background: 'transparent',
    border: 'none',
    borderBottom: `1px solid ${t.primarySoft}`,
    color: t.primary,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semiBold,
    padding: `0.15rem 0`,
    '&:hover': {
      borderBottomColor: t.primary,
      color: t.primaryHover,
    },
  },
});

export const EntryCard = styled(Box)({
  border,
  borderRadius: borderRadius.xl,
  display: 'grid',
  gap: spacing[3],
  padding: spacing[3],
  background: colorTokens.backgroundCard,

  '& .entry-head': {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
  },
  '& .entry-title': {
    ...title,
    fontSize: fontSize.sm,
  },
});

export const EntryGrid = styled(Box)({
  display: 'grid',
  gap: spacing[2],
  gridTemplateColumns: '1fr 1fr',
  '@media (max-width: 40rem)': {
    gridTemplateColumns: '1fr',
  },
});

export const TemplatePicker = styled(Box)({
  display: 'grid',
  gap: spacing[2],
  gridTemplateColumns: 'repeat(auto-fit, minmax(8.75rem, 1fr))',
  maxWidth: '100%',
  minWidth: 0,
  width: '100%',
});

export const TemplateOption = styled('button', {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>(({ active = false }) => ({
  background: active ? t.primarySofter : colorTokens.backgroundCard,
  border: active ? `1.5px solid ${t.primary}` : border,
  borderRadius: borderRadius.lg,
  color: t.text,
  cursor: 'pointer',
  display: 'grid',
  gap: spacing[1],
  fontFamily: 'inherit',
  maxWidth: '100%',
  minWidth: 0,
  overflow: 'hidden',
  padding: spacing[2],
  textAlign: 'left',
  '& .label': {
    color: active ? t.primary : t.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  '& .desc': {
    ...muted,
    display: '-webkit-box',
    fontSize: '0.7rem',
    lineHeight: 1.35,
    overflow: 'hidden',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
  },
}));
