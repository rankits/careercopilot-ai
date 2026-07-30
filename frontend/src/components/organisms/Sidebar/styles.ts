import { Box, IconButton, MuiButton, styled } from '@/lib/material';
import {
  borderRadius,
  colorTokens,
  fontSize,
  fontWeight,
  palette,
  shadows,
  spacing,
} from '@/tokens';

import type { SidebarTone, SidebarVariant } from './interfaces';

const sidebarWidths: Record<SidebarVariant, string> = {
  collapsed: '4.5rem',
  compact: '11rem',
  open: '18rem',
};

const isDark = (tone: SidebarTone) => tone === 'dark' || tone === 'gradient';

export const SidebarRoot = styled('aside', {
  shouldForwardProp: (prop) => !['tone', 'variant'].includes(String(prop)),
})<{
  tone: SidebarTone;
  variant: SidebarVariant;
}>(({ tone, variant }) => {
  const dark = isDark(tone);

  return {
    background:
      tone === 'gradient'
        ? `linear-gradient(160deg, ${colorTokens.actionPrimary} 0%, ${palette.blue800} 100%)`
        : dark
          ? palette.gray900
          : colorTokens.backgroundCard,
    border: dark ? 0 : `0.0625rem solid ${colorTokens.borderDefault}`,
    borderRadius: 0,
    boxShadow: shadows.card,
    color: dark ? colorTokens.textInverse : colorTokens.textPrimary,
    display: 'grid',
    gridTemplateRows: 'auto minmax(0, 1fr) auto auto',
    height: '100vh',
    overflow: 'visible',
    padding: spacing[3],
    position: 'relative',
    transition: 'width 180ms ease',
    width: sidebarWidths[variant],
  };
});

export const SidebarHeader = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'collapsed',
})<{ collapsed: boolean }>(({ collapsed }) => ({
  alignItems: 'center',
  borderBottom: `0.0625rem solid ${colorTokens.borderDefault}`,
  display: 'grid',
  justifyItems: 'center',
  marginInline: `-${spacing[3]}`,
  minHeight: collapsed ? spacing[10] : '7rem',
  paddingBottom: spacing[5],
  paddingInline: spacing[3],
  width: `calc(100% + ${spacing[6]})`,
}));

export const SidebarToggle = styled(IconButton)({
  '&:hover': {
    background: colorTokens.backgroundCard,
  },
  background: colorTokens.backgroundCard,
  border: `0.0625rem solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.lg,
  boxShadow: shadows.card,
  color: colorTokens.actionPrimaryActive,
  height: spacing[10],
  position: 'absolute',
  right: '-1.5rem',
  bottom: spacing[6],
  width: spacing[10],
  zIndex: 3,
});

export const SidebarLogoImage = styled('img', {
  shouldForwardProp: (prop) => prop !== 'collapsed',
})<{ collapsed: boolean }>(({ collapsed }) => ({
  display: 'block',
  height: collapsed ? spacing[10] : '6rem',
  maxWidth: collapsed ? spacing[10] : '16rem',
  objectFit: 'contain',
  width: collapsed ? spacing[10] : '100%',
}));

export const SidebarNav = styled('nav')({
  '&::-webkit-scrollbar': {
    width: '0.25rem',
  },
  '&::-webkit-scrollbar-thumb': {
    background: colorTokens.actionPrimarySubtle,
    borderRadius: borderRadius.full,
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  alignContent: 'start',
  display: 'grid',
  gap: spacing[2],
  gridAutoRows: 'max-content',
  marginBlock: spacing[5],
  overflowY: 'auto',
  paddingRight: spacing[1],
  scrollbarColor: `${colorTokens.actionPrimarySubtle} transparent`,
  scrollbarWidth: 'thin',
});

export const NavButton = styled(MuiButton, {
  shouldForwardProp: (prop) => !['active', 'collapsed', 'tone'].includes(String(prop)),
})<{
  active: boolean;
  collapsed: boolean;
  tone: SidebarTone;
}>(({ active, collapsed, tone }) => {
  const dark = isDark(tone);

  return {
    '&:hover': {
      background: dark ? 'rgba(255,255,255,0.12)' : colorTokens.actionPrimarySurface,
      color: dark ? colorTokens.textInverse : colorTokens.actionPrimaryActive,
    },
    alignItems: 'center',
    background: active
      ? dark
        ? 'rgba(255,255,255,0.14)'
        : colorTokens.actionPrimarySubtle
      : 'transparent',
    borderRadius: borderRadius.lg,
    color: active ? (dark ? colorTokens.textInverse : colorTokens.actionPrimaryActive) : 'inherit',
    display: 'grid',
    fontSize: fontSize.sm,
    fontWeight: active ? fontWeight.bold : fontWeight.medium,
    gap: spacing[3],
    gridTemplateColumns: collapsed ? '1fr' : '1.25rem 1fr',
    justifyItems: collapsed ? 'center' : 'start',
    minHeight: spacing[10],
    minWidth: 0,
    paddingInline: collapsed ? spacing[2] : spacing[3],
    textTransform: 'none',
    width: '100%',
  };
});

export const SidebarPanel = styled(Box)({
  background: colorTokens.actionPrimarySurface,
  borderRadius: borderRadius.xl,
  display: 'grid',
  gap: spacing[3],
  padding: spacing[3],
});

export const SidebarGoal = styled(Box)({
  display: 'grid',
  gap: spacing[2],
  marginTop: spacing[4],
});

export const BottomNav = styled('nav')({
  alignItems: 'center',
  background: colorTokens.backgroundCard,
  border: `0.0625rem solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius['2xl'],
  boxShadow: shadows.card,
  display: 'grid',
  gap: spacing[2],
  gridTemplateColumns: 'repeat(5, 1fr)',
  padding: spacing[3],
  position: 'fixed',
  right: spacing[4],
  bottom: spacing[4],
  left: spacing[4],
  zIndex: 10,
});

export const sidebarTextSx = {
  muted: {
    color: 'inherit',
    fontSize: fontSize.xs,
    opacity: 0.7,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
    lineHeight: 1.2,
  },
};
