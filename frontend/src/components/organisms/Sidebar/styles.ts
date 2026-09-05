import Box from '@mui/material/Box';
import MuiButton from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import { styled } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';

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
    gridTemplateRows: 'auto minmax(0, 1fr) auto',
    height: '100%',
    minHeight: 0,
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
  gap: collapsed ? 0 : spacing[2],
  justifyItems: 'center',
  marginInline: `-${spacing[3]}`,
  minHeight: collapsed ? spacing[10] : '7rem',
  paddingBottom: spacing[4],
  paddingInline: spacing[3],
  paddingTop: spacing[1],
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
  color: colorTokens.actionPrimary,
  height: spacing[10],
  position: 'absolute',
  right: '-1.5rem',
  bottom: spacing[6],
  width: spacing[10],
  // Stay above profile sticky action bars that sit near the bottom of content.
  zIndex: 1200,
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

export const SidebarLogoLink = styled(RouterLink)({
  alignItems: 'center',
  display: 'inline-flex',
  justifyContent: 'center',
  lineHeight: 0,
  maxWidth: '100%',
  textDecoration: 'none',
});

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
  gap: spacing[3],
  gridAutoRows: 'max-content',
  marginBlock: spacing[4],
  overflowY: 'auto',
  paddingRight: spacing[1],
  scrollbarColor: `${colorTokens.actionPrimarySubtle} transparent`,
  scrollbarWidth: 'thin',
});

export const SidebarNavGroup = styled(Box)({
  display: 'grid',
  gap: spacing[1],
});

export const SidebarSectionLabel = styled('p')({
  color: colorTokens.textTertiary,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.extraBold,
  letterSpacing: '0.08em',
  margin: 0,
  paddingInline: spacing[1],
  textTransform: 'uppercase',
});

export const SidebarSectionDivider = styled('div')({
  background: colorTokens.borderDefault,
  height: '0.0625rem',
  marginBlock: spacing[2],
  width: '100%',
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
    '& .MuiButton-startIcon, & .MuiSvgIcon-root': {
      color: active ? (dark ? colorTokens.textInverse : colorTokens.actionPrimary) : 'inherit',
      fontSize: '1.125rem',
    },
    '&:focus-visible': {
      outline: `0.125rem solid ${colorTokens.borderFocus}`,
      outlineOffset: '0.0625rem',
    },
    '&:hover': {
      background: dark ? 'rgba(255,255,255,0.12)' : colorTokens.actionPrimarySurface,
      color: dark ? colorTokens.textInverse : colorTokens.actionPrimary,
    },
    alignItems: 'center',
    background: active
      ? dark
        ? 'rgba(255,255,255,0.14)'
        : colorTokens.actionPrimarySurface
      : 'transparent',
    borderRadius: borderRadius.lg,
    boxShadow:
      active && !dark && !collapsed
        ? `inset 0.1875rem 0 0 ${colorTokens.actionPrimary}`
        : active && !dark && collapsed
          ? `inset 0.1875rem 0 0 ${colorTokens.actionPrimary}`
          : 'none',
    color: active ? (dark ? colorTokens.textInverse : colorTokens.actionPrimary) : 'inherit',
    display: 'grid',
    fontSize: fontSize.sm,
    fontWeight: active ? fontWeight.bold : fontWeight.medium,
    gap: spacing[3],
    gridTemplateColumns: collapsed ? '1fr' : '1.375rem 1fr',
    justifyItems: collapsed ? 'center' : 'start',
    minHeight: spacing[10],
    minWidth: 0,
    paddingBlock: spacing[2],
    paddingInline: collapsed ? spacing[2] : spacing[3],
    textTransform: 'none',
    transition: 'background-color 160ms ease, box-shadow 160ms ease, color 160ms ease',
    width: '100%',
  };
});

export const SidebarFooter = styled(Box)({
  display: 'grid',
  gap: spacing[3],
  marginTop: spacing[2],
});

export const LatestResumeCard = styled(Box)({
  background: colorTokens.backgroundCard,
  border: `0.0625rem solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.xl,
  display: 'grid',
  gap: spacing[2],
  padding: spacing[3],
});

export const LatestResumeCardHeader = styled(Box)({
  alignItems: 'center',
  display: 'flex',
  gap: spacing[2],
  minWidth: 0,
});

export const ResumeScoreBadge = styled('span')({
  background: colorTokens.feedbackSuccessSurface,
  borderRadius: borderRadius.full,
  color: colorTokens.feedbackSuccess,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.bold,
  lineHeight: 1.2,
  marginLeft: 'auto',
  padding: `${spacing[1]} ${spacing[2]}`,
  whiteSpace: 'nowrap',
});

export const LatestResumeFileName = styled('p')({
  color: colorTokens.textPrimary,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.bold,
  lineHeight: 1.35,
  margin: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const LatestResumeMeta = styled('p')({
  color: colorTokens.textTertiary,
  fontSize: fontSize.xs,
  lineHeight: 1.35,
  margin: 0,
});

export const ViewAllVersionsButton = styled(MuiButton)({
  '&:hover': {
    background: 'transparent',
    color: colorTokens.actionPrimaryHover,
  },
  color: colorTokens.actionPrimary,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.bold,
  justifySelf: 'center',
  minHeight: 'auto',
  paddingBlock: spacing[1],
  textTransform: 'none',
});

export const AiHelpCard = styled(MuiButton)({
  '&:focus-visible': {
    outline: `0.125rem solid ${colorTokens.borderFocus}`,
    outlineOffset: '0.0625rem',
  },
  '&:hover': {
    background: colorTokens.actionPrimarySubtle,
  },
  alignItems: 'center',
  background: colorTokens.actionPrimarySurface,
  border: 0,
  borderRadius: borderRadius.xl,
  color: colorTokens.textPrimary,
  display: 'grid',
  gap: spacing[2],
  gridTemplateColumns: 'auto 1fr auto',
  justifyContent: 'start',
  minHeight: spacing[12],
  padding: spacing[3],
  textAlign: 'left',
  textTransform: 'none',
  transition: 'background-color 160ms ease',
  width: '100%',
});

export const AiHelpCopy = styled(Box)({
  display: 'grid',
  gap: '0.125rem',
  minWidth: 0,
});

export const AiHelpTitle = styled('span')({
  color: colorTokens.textPrimary,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.extraBold,
  lineHeight: 1.25,
});

export const AiHelpSubtitle = styled('span')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.xs,
  lineHeight: 1.35,
});

export const AiHelpPenguin = styled('img')({
  display: 'block',
  flexShrink: 0,
  height: spacing[10],
  objectFit: 'contain',
  width: spacing[10],
});

export const BottomNav = styled('nav')({
  alignItems: 'stretch',
  background: colorTokens.backgroundCard,
  border: `0.0625rem solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius['2xl'],
  boxShadow: shadows.card,
  display: 'grid',
  gap: spacing[1],
  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
  padding: `${spacing[2]} ${spacing[2]}`,
  paddingBottom: `calc(${spacing[2]} + env(safe-area-inset-bottom, 0px))`,
  position: 'fixed',
  right: spacing[3],
  bottom: spacing[3],
  left: spacing[3],
  zIndex: 10,
});

export const MoreNavButton = styled(MuiButton, {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>(({ active }) => ({
  '&:hover': {
    background: colorTokens.actionPrimarySubtle,
    color: colorTokens.actionPrimary,
  },
  background: active ? colorTokens.actionPrimarySubtle : 'transparent',
  borderRadius: borderRadius.lg,
  color: active ? colorTokens.actionPrimary : colorTokens.textSecondary,
  display: 'grid',
  fontSize: '0.6875rem',
  fontWeight: active ? fontWeight.bold : fontWeight.medium,
  gap: '0.125rem',
  gridTemplateColumns: '1fr',
  justifyItems: 'center',
  lineHeight: 1.2,
  minHeight: spacing[10],
  minWidth: 0,
  paddingInline: '0.125rem',
  textTransform: 'none',
  width: '100%',

  '& > span': {
    display: 'block',
    maxWidth: '100%',
    overflow: 'visible',
    textAlign: 'center',
    whiteSpace: 'normal',
  },
}));

export const mobileDrawerPaperSx = {
  borderTopLeftRadius: borderRadius['2xl'],
  borderTopRightRadius: borderRadius['2xl'],
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: spacing[4],
  maxHeight: 'min(85dvh, 40rem)',
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  padding: `${spacing[3]} ${spacing[4]} calc(${spacing[5]} + env(safe-area-inset-bottom, 0px))`,
  width: '100%',
} as const;

export const MobileDrawerHandle = styled('div')({
  alignSelf: 'center',
  background: colorTokens.borderDefault,
  borderRadius: borderRadius.full,
  flexShrink: 0,
  height: '0.25rem',
  marginBottom: spacing[1],
  width: '2.5rem',
});

export const MobileDrawerHeader = styled(Box)({
  alignItems: 'center',
  borderBottom: `0.0625rem solid ${colorTokens.borderSubtle}`,
  display: 'flex',
  gap: spacing[3],
  justifyContent: 'space-between',
  minWidth: 0,
  paddingBottom: spacing[3],
});

export const MobileDrawerIdentity = styled(Box)({
  alignItems: 'center',
  display: 'flex',
  gap: spacing[3],
  minWidth: 0,
});

export const MobileDrawerAvatar = styled('span')({
  alignItems: 'center',
  background: colorTokens.actionPrimaryGradient,
  borderRadius: borderRadius.full,
  color: colorTokens.textInverse,
  display: 'inline-flex',
  flexShrink: 0,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.extraBold,
  height: spacing[10],
  justifyContent: 'center',
  letterSpacing: '0.02em',
  width: spacing[10],
});

export const MobileDrawerTitleGroup = styled(Box)({
  display: 'grid',
  gap: '0.125rem',
  minWidth: 0,
});

export const MobileDrawerTitle = styled('p')({
  color: colorTokens.textPrimary,
  fontSize: fontSize.base,
  fontWeight: fontWeight.extraBold,
  lineHeight: 1.25,
  margin: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const MobileDrawerSection = styled(Box)({
  display: 'grid',
  gap: spacing[2],
});

export const MobileDrawerSectionLabel = styled('p')({
  color: colorTokens.textTertiary,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.extraBold,
  letterSpacing: '0.08em',
  margin: 0,
  textTransform: 'uppercase',
});

export const MobileDrawerList = styled('div')({
  display: 'grid',
  gap: spacing[2],
});

export const MobileDrawerItem = styled(MuiButton, {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>(({ active }) => ({
  '&:hover': {
    background: colorTokens.actionPrimarySubtle,
    color: colorTokens.actionPrimary,
  },
  background: active ? colorTokens.actionPrimarySubtle : palette.gray50,
  border: 0,
  borderRadius: borderRadius.lg,
  boxShadow: active ? `inset 0.1875rem 0 0 ${colorTokens.actionPrimary}` : 'none',
  color: active ? colorTokens.actionPrimary : colorTokens.textPrimary,
  display: 'grid',
  fontSize: fontSize.sm,
  fontWeight: active ? fontWeight.bold : fontWeight.medium,
  gap: spacing[3],
  gridTemplateColumns: '1.25rem 1fr',
  justifyContent: 'start',
  justifyItems: 'start',
  minHeight: spacing[10],
  paddingInline: spacing[3],
  textTransform: 'none',
  width: '100%',
}));

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
