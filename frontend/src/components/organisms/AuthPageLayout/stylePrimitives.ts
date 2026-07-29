import { Box, styled, Typography, type SxProps, type Theme } from '@/lib/material';
import {
  borderRadius,
  borderWidth,
  colorTokens,
  fontSize,
  fontWeight,
  shadows,
  sizing,
} from '@/tokens';

export const createStyledBox = (styles: SxProps<Theme>) =>
  styled(Box)(({ theme }) => theme.unstable_sx(styles));

export const createStyledText = (styles: SxProps<Theme>) =>
  styled(Typography)(({ theme }) => theme.unstable_sx(styles));

export const createStyledImage = (styles: SxProps<Theme>) =>
  styled('img')(({ theme }) => theme.unstable_sx(styles));

export const flex = { display: 'flex' } as const;
export const grid = { display: 'grid' } as const;
export const alignCenter = { alignItems: 'center' } as const;
export const flexCenter = { ...flex, ...alignCenter, justifyContent: 'center' } as const;
export const flexBetween = {
  ...flex,
  ...alignCenter,
  justifyContent: 'space-between',
} as const;

export const secondaryText = { color: colorTokens.textSecondary } as const;
export const bodyText = { ...secondaryText, fontSize: fontSize.base } as const;
export const featureTitleBase = {
  color: colorTokens.textPrimary,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.bold,
} as const;
export const headingBase = {
  color: colorTokens.textPrimary,
  fontWeight: fontWeight.extraBold,
  m: 0,
} as const;

export const elevatedSurface = {
  bgcolor: colorTokens.backgroundCard,
  borderRadius: borderRadius['2xl'],
  boxShadow: shadows.card,
} as const;
export const borderedCardSurface = {
  ...elevatedSurface,
  border: `${borderWidth.thin} solid ${colorTokens.borderDefault}`,
} as const;

const iconSurfaceBase = {
  ...flexCenter,
  bgcolor: colorTokens.actionPrimarySubtle,
  borderRadius: borderRadius.full,
  color: colorTokens.actionPrimary,
} as const;

export const authLayout = {
  contentColumns: `minmax(0, 52fr) minmax(${sizing[30]}, 48fr)`,
  contentMaxWidth: sizing[100],
  formMaxWidth: sizing[38],
  mobileColumn: 'minmax(0, 1fr)',
  registerColumns: `minmax(${sizing[30]}, 45fr) minmax(0, 55fr)`,
  viewportHeight: '100dvh',
} as const;

export const createIconSurface = (size: string, shrink = false) => ({
  ...iconSurfaceBase,
  ...(shrink ? { flexShrink: 0 } : {}),
  height: size,
  width: size,
});

export const createResponsiveColumns = (desktopColumns: string) => ({
  xs: authLayout.mobileColumn,
  lg: desktopColumns,
});
