import type { ElementType } from 'react';

import {
  Box,
  CloseIcon,
  Dialog,
  Drawer,
  IconButton,
  SmartToyOutlinedIcon,
  Typography,
  styled,
} from '@/lib/material';
import {
  borderRadius,
  colorTokens,
  fontSize,
  fontWeight,
  palette,
  shadows,
  spacing,
} from '@/tokens';

export const CopilotFab = styled('button')({
  alignItems: 'center',
  background: colorTokens.actionPrimaryGradient,
  border: 'none',
  borderRadius: borderRadius.full,
  bottom: '6.5rem',
  boxShadow: '0 16px 40px rgba(130, 48, 240, 0.35)',
  color: colorTokens.textInverse,
  cursor: 'pointer',
  display: 'inline-flex',
  height: '3.5rem',
  justifyContent: 'center',
  position: 'fixed',
  right: spacing[5],
  transition: 'transform 180ms ease, box-shadow 180ms ease',
  width: '3.5rem',
  zIndex: 1300,

  '&:hover': {
    boxShadow: '0 18px 44px rgba(130, 48, 240, 0.42)',
    transform: 'translateY(-2px) scale(1.03)',
  },

  '&:focus-visible': {
    outline: `0.125rem solid ${colorTokens.borderFocus}`,
    outlineOffset: '0.1875rem',
  },

  '@media (min-width: 761px)': {
    bottom: spacing[6],
  },
});

export const ChatDrawerPaper = styled(Box)({
  background: colorTokens.backgroundCard,
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  maxWidth: '100%',
  width: '26.5rem',
});

export const ChatDialogPaperSx = {
  background: colorTokens.backgroundCard,
  borderRadius: 0,
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  margin: 0,
  maxHeight: '100%',
  maxWidth: '100%',
  width: '100%',
} as const;

export const ChatHeader = styled(Box)({
  alignItems: 'center',
  background: `linear-gradient(180deg, ${palette.blue50} 0%, ${colorTokens.backgroundCard} 100%)`,
  borderBottom: `0.0625rem solid ${colorTokens.borderSubtle}`,
  display: 'flex',
  flexShrink: 0,
  gap: spacing[3],
  justifyContent: 'space-between',
  padding: `${spacing[4]} ${spacing[5]}`,
});

export const ChatHeaderMain = styled(Box)({
  alignItems: 'center',
  display: 'flex',
  gap: spacing[3],
  minWidth: 0,
});

export const ChatHeaderIcon = styled('span')({
  alignItems: 'center',
  background: colorTokens.actionPrimaryGradient,
  borderRadius: borderRadius.xl,
  boxShadow: shadows.card,
  color: colorTokens.textInverse,
  display: 'inline-flex',
  flexShrink: 0,
  height: '2.75rem',
  justifyContent: 'center',
  width: '2.75rem',
});

export const ChatHeaderTitle = styled(Typography)<{ component?: ElementType }>({
  color: colorTokens.textPrimary,
  fontSize: fontSize.lg,
  fontWeight: fontWeight.bold,
  lineHeight: 1.2,
});

export const ChatHeaderSubtitle = styled(Typography)<{ component?: ElementType }>({
  color: colorTokens.textSecondary,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
});

export const ChatMessages = styled(Box)({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: spacing[4],
  overflowY: 'auto',
  padding: spacing[5],
});

export const PromptChipGrid = styled(Box)({
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing[2],
  paddingBottom: spacing[2],
});

export const TypingRow = styled(Box)({
  alignItems: 'center',
  color: colorTokens.textSecondary,
  display: 'flex',
  fontSize: fontSize.sm,
  gap: spacing[2],
  paddingInline: spacing[1],
});

export const RetryRow = styled(Box)({
  display: 'flex',
  justifyContent: 'flex-start',
  paddingInline: spacing[1],
});

export { CloseIcon, Dialog, Drawer, IconButton, SmartToyOutlinedIcon };
