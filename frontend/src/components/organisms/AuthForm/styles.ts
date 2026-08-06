import type { SxProps, Theme } from '@/lib/material';
import { borderRadius, colorTokens, fontSize, fontWeight, spacing } from '@/tokens';

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
    boxShadow: 'none',
    boxSizing: 'border-box',
    display: 'grid',
    gap: { xs: spacing[4], md: spacing[4], lg: spacing[5] },
    margin: '0 auto',
    maxWidth: '28rem',
    p: { xs: spacing[4], sm: spacing[5], md: spacing[6] },
    pb: { xs: spacing[5], sm: spacing[6], md: spacing[6], lg: spacing[7] },
    width: '100%',
    '@media (max-height: 56.25rem) and (min-width: 56.25rem)': {
      gap: spacing[3],
      p: spacing[4],
      pb: spacing[5],
    },
    '@media (max-width: 56.24rem)': {
      gap: { xs: spacing[4], sm: spacing[4] },
      maxWidth: '100%',
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
    mt: spacing[1],
    textAlign: 'center',
  } satisfies SxProps<Theme>,
  header: {
    display: 'grid',
    gap: spacing[2],
  } satisfies SxProps<Theme>,
  link: {
    color: colorTokens.actionPrimary,
    fontWeight: fontWeight.medium,
    textDecoration: 'none',
  } satisfies SxProps<Theme>,
  registerCard: {
    alignContent: 'start',
    maxWidth: '33rem',
    gap: { xs: spacing[4], sm: spacing[5], md: spacing[5], lg: spacing[6] },
    p: { xs: spacing[5], sm: spacing[6], md: spacing[7] },
    pb: { xs: spacing[6], sm: spacing[7], md: spacing[8] },
    '@media (max-height: 56.25rem) and (min-width: 56.25rem)': {
      alignContent: 'stretch',
      gap: spacing[3],
      p: spacing[5],
      pb: spacing[6],
      gridTemplateRows: 'auto auto auto minmax(max-content, 1fr) auto',
    },
    '@media (max-width: 37.5rem)': {
      gap: spacing[4],
      maxWidth: '100%',
      p: spacing[4],
    },
  } satisfies SxProps<Theme>,
  registerFields: {
    columnGap: spacing[3],
    gap: { xs: spacing[3], sm: spacing[4], md: spacing[4], lg: spacing[5] },
    rowGap: { xs: spacing[3], sm: spacing[4], md: spacing[4], lg: spacing[5] },
    '@media (max-height: 56.25rem) and (min-width: 56.25rem)': {
      alignContent: 'space-between',
      gap: spacing[3],
      rowGap: spacing[3],
      height: '100%',
    },
    '@media (min-width: 37.5rem)': {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      '& > *:nth-of-type(3), & > *:nth-of-type(4)': {
        gridColumn: '1 / -1',
      },
    },
    '@media (max-width: 37.5rem)': {
      gap: spacing[3],
      rowGap: spacing[3],
    },
  } satisfies SxProps<Theme>,
  registerHeader: {
    gap: spacing[2],
    '@media (max-height: 56.25rem) and (min-width: 56.25rem)': {
      gap: spacing[1],
    },
  } satisfies SxProps<Theme>,
  registerSocialStack: {
    gap: spacing[3],
    '& > button': {
      minHeight: { xs: spacing[10], sm: spacing[12] },
      py: 0,
    },
    '@media (max-height: 56.25rem) and (min-width: 56.25rem)': {
      gap: spacing[2],
      '& > button': {
        minHeight: spacing[9],
      },
    },
  } satisfies SxProps<Theme>,
  stack: {
    display: 'grid',
    gap: spacing[4],
    '@media (max-height: 56.25rem) and (min-width: 56.25rem)': {
      gap: spacing[3],
    },
    '@media (max-width: 37.5rem)': {
      gap: spacing[3],
    },
  } satisfies SxProps<Theme>,
  subtitle: {
    color: colorTokens.textSecondary,
    fontSize: { xs: fontSize.base, sm: fontSize.lg },
    m: 0,
    '@media (max-height: 56.25rem) and (min-width: 56.25rem)': {
      fontSize: fontSize.base,
    },
  } satisfies SxProps<Theme>,
  title: {
    color: colorTokens.textPrimary,
    fontSize: { xs: fontSize['2xl'], sm: fontSize['3xl'] },
    fontWeight: fontWeight.extraBold,
    m: 0,
    '@media (max-height: 56.25rem) and (min-width: 56.25rem)': {
      fontSize: fontSize['2xl'],
    },
  } satisfies SxProps<Theme>,
};
