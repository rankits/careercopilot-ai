import type { SxProps, Theme } from '@mui/material/styles';

import { borderRadius, colorTokens, fontSize, fontWeight, shadows, spacing } from '@/tokens';

export const jobFeedStatusSx = {
  root: {
    alignItems: 'center',
    background: colorTokens.backgroundCard,
    border: `0.0625rem solid ${colorTokens.borderDefault}`,
    borderRadius: borderRadius.xl,
    boxShadow: shadows.card,
    display: 'grid',
    gap: spacing[3],
    justifyItems: 'center',
    padding: `${spacing[5]} ${spacing[4]}`,
    textAlign: 'center',
    width: '100%',
  } satisfies SxProps<Theme>,

  loadingRoot: {
    alignItems: 'center',
    background: colorTokens.backgroundCard,
    border: `0.0625rem solid ${colorTokens.borderDefault}`,
    borderRadius: borderRadius.xl,
    boxShadow: shadows.card,
    display: 'grid',
    gap: spacing[3],
    justifyItems: 'center',
    minHeight: '12rem',
    padding: spacing[6],
  } satisfies SxProps<Theme>,

  skeletonRoot: {
    display: 'grid',
    gap: spacing[3],
    width: '100%',
  } satisfies SxProps<Theme>,

  skeletonCard: {
    background: colorTokens.backgroundCard,
    border: `0.0625rem solid ${colorTokens.borderDefault}`,
    borderRadius: borderRadius.xl,
    boxShadow: shadows.card,
    display: 'grid',
    gap: spacing[2],
    padding: spacing[4],
  } satisfies SxProps<Theme>,

  visuallyHidden: {
    border: 0,
    clip: 'rect(0 0 0 0)',
    height: '1px',
    margin: '-1px',
    overflow: 'hidden',
    padding: 0,
    position: 'absolute',
    whiteSpace: 'nowrap',
    width: '1px',
  } satisfies SxProps<Theme>,

  loadingLabel: {
    color: colorTokens.textSecondary,
    fontSize: fontSize.sm,
  } satisfies SxProps<Theme>,

  iconWrap: {
    alignItems: 'center',
    borderRadius: borderRadius.full,
    display: 'grid',
    height: spacing[12],
    justifyItems: 'center',
    width: spacing[12],
  } satisfies SxProps<Theme>,

  copy: {
    display: 'grid',
    gap: spacing[1],
    maxWidth: '28rem',
  } satisfies SxProps<Theme>,

  title: {
    color: colorTokens.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    m: 0,
  } satisfies SxProps<Theme>,

  message: {
    color: colorTokens.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 1.5,
    m: 0,
  } satisfies SxProps<Theme>,
};
