import type { SxProps, Theme } from '@mui/material/styles';

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
    p: '24px',
    width: '100%',
    '@media (max-height: 56.25rem) and (min-width: 56.25rem)': {
      gap: spacing[3],
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
    gap: { xs: spacing[3], sm: spacing[3], md: spacing[4], lg: spacing[4] },
    p: '24px',
    width: '100%',
    '@media (max-height: 56.25rem) and (min-width: 56.25rem)': {
      alignContent: 'stretch',
      gap: spacing[3],
      gridTemplateRows: 'auto auto auto minmax(max-content, 1fr) auto',
    },
    '@media (max-width: 37.5rem)': {
      gap: spacing[3],
      maxWidth: '100%',
    },
  } satisfies SxProps<Theme>,
  countryCodeSelect: {
    alignItems: 'center',
    bgcolor: colorTokens.backgroundCard,
    border: `0.0625rem solid ${colorTokens.borderDefault}`,
    borderRadius: borderRadius.lg,
    boxSizing: 'border-box',
    color: colorTokens.textPrimary,
    cursor: 'pointer',
    display: 'flex',
    fontFamily: 'inherit',
    fontSize: fontSize.base,
    gap: spacing[2],
    height: spacing[12],
    justifyContent: 'flex-start',
    minHeight: spacing[12],
    px: spacing[2],
    textAlign: 'left',
    width: '100%',
    '&:hover': {
      borderColor: colorTokens.borderHover,
    },
  } satisfies SxProps<Theme>,
  phoneRow: {
    alignItems: 'start',
    display: 'grid',
    gap: spacing[2],
    gridColumn: '1 / -1',
    gridTemplateColumns: { xs: '6.75rem 1fr', sm: '7.25rem 1fr' },
    width: '100%',
  } satisfies SxProps<Theme>,
  registerFields: {
    columnGap: spacing[3],
    gap: { xs: spacing[2], sm: spacing[3], md: spacing[3], lg: spacing[3] },
    rowGap: { xs: spacing[2], sm: spacing[3], md: spacing[3], lg: spacing[3] },
    '@media (max-height: 56.25rem) and (min-width: 56.25rem)': {
      alignContent: 'space-between',
      gap: spacing[2],
      rowGap: spacing[2],
      height: '100%',
    },
    '@media (min-width: 37.5rem)': {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      // Email, phone, password, confirm password stay full-width.
      '& > *:nth-of-type(n+3)': {
        gridColumn: '1 / -1',
      },
    },
    '@media (max-width: 37.5rem)': {
      gap: spacing[2],
      rowGap: spacing[2],
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
    '@media (max-height: 56.25rem) and (min-width: 56.25rem)': {
      gap: spacing[2],
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
