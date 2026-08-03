import { Box, Typography, styled } from '@/lib/material';
import { colorTokens, fontSize, fontWeight, spacing } from '@/tokens';

import { border, borderRadius, muted, t, title } from '../../styles/shared';

export const SectionEditorShell = styled(Box)({
  display: 'grid',
  gap: spacing[3],
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
  minHeight: '2.5rem',
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
  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
  '@media (max-width: 64rem)': {
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  },
  '@media (max-width: 40rem)': {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
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
  padding: spacing[2],
  textAlign: 'left',
  '& .label': {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
    color: active ? t.primary : t.text,
  },
  '& .desc': {
    ...muted,
    fontSize: '0.7rem',
    lineHeight: 1.35,
  },
}));
