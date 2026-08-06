import type { SxProps, Theme } from '@/lib/material';
import { borderRadius, colorTokens, fontSize, fontWeight, shadows, spacing } from '@/tokens';

export const authFormSx = {
  actions: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing[2],
    justifyContent: 'space-between',
    rowGap: spacing[2],
  } satisfies SxProps<Theme>,
  card: {
    bgcolor: colorTokens.backgroundCard,
    border: `0.0625rem solid ${colorTokens.borderDefault}`,
    borderRadius: borderRadius['2xl'],
    boxShadow: shadows.card,
    boxSizing: 'border-box',
    display: 'grid',
    gap: spacing[8],
    maxWidth: '100%',
    p: { xs: spacing[5], sm: spacing[8], md: spacing[10], lg: spacing[12] },
    width: '100%',
    '@media (max-height: 56.25rem) and (min-width: 75rem)': {
      gap: spacing[4],
      p: spacing[5],
    },
    '@media (max-width: 74.9375rem)': {
      gap: { xs: spacing[5], sm: spacing[6] },
    },
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
    fontSize: { xs: fontSize.sm, sm: fontSize.base },
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
  registerCard: {
    alignContent: 'start',
    gap: { xs: spacing[4], sm: spacing[5], lg: spacing[4], xl: spacing[5] },
    '@media (max-height: 56.25rem) and (min-width: 75rem)': {
      alignContent: 'stretch',
      gap: spacing[3],
      gridTemplateRows: 'auto auto auto minmax(max-content, 1fr) auto',
    },
    '@media (max-width: 37.5rem)': {
      gap: spacing[4],
    },
  } satisfies SxProps<Theme>,
  registerFields: {
    '@media (max-height: 56.25rem) and (min-width: 75rem)': {
      alignContent: 'space-between',
      gap: spacing[2],
      height: '100%',
    },
    '@media (min-width: 37.5rem)': {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      '& > *:nth-child(n + 3)': {
        gridColumn: '1 / -1',
      },
    },
    '@media (max-width: 37.5rem)': {
      gap: spacing[3],
    },
  } satisfies SxProps<Theme>,
  registerHeader: {
    gap: spacing[2],
    '@media (max-height: 56.25rem) and (min-width: 75rem)': {
      gap: spacing[1],
    },
  } satisfies SxProps<Theme>,
  registerSocialStack: {
    gap: spacing[3],
    '& > button': {
      minHeight: { xs: spacing[10], sm: spacing[12] },
      py: 0,
    },
    '@media (max-height: 56.25rem) and (min-width: 75rem)': {
      gap: spacing[2],
      '& > button': {
        minHeight: spacing[10],
      },
    },
  } satisfies SxProps<Theme>,
  stack: {
    display: 'grid',
    gap: spacing[5],
    '@media (max-height: 56.25rem) and (min-width: 75rem)': {
      gap: spacing[3],
    },
    '@media (max-width: 37.5rem)': {
      gap: spacing[4],
    },
  } satisfies SxProps<Theme>,
  subtitle: {
    color: colorTokens.textSecondary,
    fontSize: { xs: fontSize.base, sm: fontSize.lg },
    m: 0,
    '@media (max-height: 56.25rem) and (min-width: 75rem)': {
      fontSize: fontSize.base,
    },
  } satisfies SxProps<Theme>,
  title: {
    color: colorTokens.textPrimary,
    fontSize: { xs: fontSize['2xl'], sm: fontSize['3xl'] },
    fontWeight: fontWeight.extraBold,
    m: 0,
    '@media (max-height: 56.25rem) and (min-width: 75rem)': {
      fontSize: fontSize['2xl'],
    },
  } satisfies SxProps<Theme>,
};
