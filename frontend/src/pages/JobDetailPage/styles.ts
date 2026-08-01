import type { SxProps, Theme } from '@/lib/material';
import { borderRadius, colorTokens, fontSize, fontWeight, spacing } from '@/tokens';

export const jobDetailPageSx = {
  root: {
    display: 'grid',
    gap: spacing[4],
    padding: `${spacing[2]} 0 ${spacing[6]}`,
  } satisfies SxProps<Theme>,
  centered: {
    display: 'grid',
    gap: spacing[2],
    justifyItems: 'start',
    py: 8,
  } satisfies SxProps<Theme>,
  content: {
    display: 'grid',
    gap: spacing[3],
  } satisfies SxProps<Theme>,
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    margin: 0,
  } satisfies SxProps<Theme>,
  subtitle: {
    color: colorTokens.textSecondary,
    fontSize: fontSize.lg,
  } satisfies SxProps<Theme>,
  meta: {
    color: colorTokens.textSecondary,
    fontSize: fontSize.sm,
  } satisfies SxProps<Theme>,
  actions: {
    display: 'flex',
    gap: spacing[2],
  } satisfies SxProps<Theme>,
  muted: {
    color: colorTokens.textSecondary,
  } satisfies SxProps<Theme>,
  skills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing[1],
  } satisfies SxProps<Theme>,
  skill: {
    background: colorTokens.backgroundCard,
    border: `0.0625rem solid ${colorTokens.borderDefault}`,
    borderRadius: borderRadius.md,
    fontSize: fontSize.sm,
    padding: `${spacing[1]} ${spacing[2]}`,
  } satisfies SxProps<Theme>,
  description: {
    lineHeight: 1.6,
    '& p': { marginBottom: spacing[2] },
    '& ul': { paddingLeft: spacing[4] },
  } satisfies SxProps<Theme>,
  panel: {
    background: colorTokens.backgroundCard,
    border: `0.0625rem solid ${colorTokens.borderDefault}`,
    borderRadius: borderRadius.xl,
    display: 'grid',
    gap: spacing[2],
    padding: spacing[4],
  } satisfies SxProps<Theme>,
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    margin: 0,
  } satisfies SxProps<Theme>,
  listItem: {
    fontSize: fontSize.sm,
    lineHeight: 1.6,
    margin: 0,
  } satisfies SxProps<Theme>,
};
