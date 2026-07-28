import type { SxProps, Theme } from '@mui/material/styles';

import { borderRadius, colorTokens, fontSize, fontWeight, shadows, spacing } from '@/tokens';

export const authFormSx = {
  actions: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
  } satisfies SxProps<Theme>,
  card: {
    bgcolor: colorTokens.backgroundCard,
    border: `0.0625rem solid ${colorTokens.borderDefault}`,
    borderRadius: borderRadius['2xl'],
    boxShadow: shadows.card,
    display: 'grid',
    gap: spacing[6],
    maxWidth: '42rem',
    p: { xs: spacing[6], sm: spacing[10] },
    width: '100%',
  } satisfies SxProps<Theme>,
  divider: {
    '&::after, &::before': {
      bgcolor: colorTokens.borderDefault,
      content: '""',
      height: '0.0625rem',
      width: '100%',
    },
    alignItems: 'center',
    color: colorTokens.textSecondary,
    display: 'grid',
    gap: spacing[4],
    gridTemplateColumns: '1fr auto 1fr',
  } satisfies SxProps<Theme>,
  footer: {
    color: colorTokens.textSecondary,
    fontSize: fontSize.base,
    textAlign: 'center',
  } satisfies SxProps<Theme>,
  header: {
    display: 'grid',
    gap: spacing[3],
  } satisfies SxProps<Theme>,
  link: {
    color: colorTokens.actionPrimary,
    fontWeight: fontWeight.medium,
    textDecoration: 'none',
  } satisfies SxProps<Theme>,
  stack: {
    display: 'grid',
    gap: spacing[5],
  } satisfies SxProps<Theme>,
  subtitle: {
    color: colorTokens.textSecondary,
    fontSize: fontSize.lg,
    m: 0,
  } satisfies SxProps<Theme>,
  title: {
    color: colorTokens.textPrimary,
    fontSize: { xs: fontSize['2xl'], sm: fontSize['3xl'] },
    fontWeight: fontWeight.extraBold,
    m: 0,
  } satisfies SxProps<Theme>,
};
