import { Box, styled } from '@/lib/material';
import { borderRadius, colorTokens, fontSize, fontWeight, palette, spacing } from '@/tokens';

import { ApplicationDialog, CloseButton } from '../ApplicationDialog/styles';

const mobileBreakpoint = '@media (max-width: 47.5rem)';

export type ConfirmDialogIntent = 'archive' | 'delete' | 'restore';

export const ConfirmApplicationDialog = styled(ApplicationDialog)({
  '& .MuiDialog-paper': {
    maxWidth: '28rem',
  },
});

export const ConfirmHeaderAccent = styled('div', {
  shouldForwardProp: (prop) => prop !== 'intent',
})<{ intent: ConfirmDialogIntent }>(({ intent }) => ({
  background:
    intent === 'delete'
      ? `linear-gradient(90deg, ${palette.red500} 0%, ${palette.red700} 100%)`
      : colorTokens.actionPrimaryGradient,
  height: '0.25rem',
  width: '100%',
}));

export const ConfirmHeader = styled(Box)({
  alignItems: 'center',
  display: 'flex',
  gap: spacing[3],
  justifyContent: 'space-between',
  padding: `${spacing[5]} ${spacing[5]} ${spacing[2]}`,
});

export const ConfirmHeaderMain = styled(Box)({
  alignItems: 'center',
  display: 'flex',
  flex: '1 1 auto',
  gap: spacing[3],
  minWidth: 0,
});

export const ConfirmIcon = styled('span', {
  shouldForwardProp: (prop) => prop !== 'intent',
})<{ intent: ConfirmDialogIntent }>(({ intent }) => {
  const styles = {
    archive: {
      background: palette.gray100,
      color: palette.gray700,
    },
    delete: {
      background: colorTokens.feedbackErrorSurface,
      color: colorTokens.feedbackError,
    },
    restore: {
      background: colorTokens.actionPrimarySurface,
      color: colorTokens.actionPrimary,
    },
  }[intent];

  return {
    alignItems: 'center',
    background: styles.background,
    borderRadius: borderRadius.xl,
    color: styles.color,
    display: 'inline-flex',
    flexShrink: 0,
    height: spacing[10],
    justifyContent: 'center',
    width: spacing[10],

    '& svg': {
      fontSize: fontSize.xl,
    },
  };
});

export const ConfirmTitle = styled('h2')({
  alignSelf: 'center',
  color: colorTokens.textPrimary,
  fontSize: fontSize.xl,
  fontWeight: fontWeight.extraBold,
  lineHeight: 1.2,
  margin: 0,
});

export const ConfirmBody = styled(Box)({
  padding: `0 ${spacing[5]} ${spacing[5]}`,
});

export const ConfirmMessage = styled('p')({
  background: palette.gray50,
  border: `0.0625rem solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.xl,
  color: colorTokens.textSecondary,
  fontSize: fontSize.sm,
  lineHeight: 1.6,
  margin: 0,
  padding: spacing[4],
});

export const ConfirmFooter = styled(Box)({
  alignItems: 'center',
  background: palette.gray50,
  borderTop: `0.0625rem solid ${colorTokens.borderDefault}`,
  display: 'flex',
  gap: spacing[3],
  justifyContent: 'flex-end',
  padding: `${spacing[4]} ${spacing[5]} ${spacing[5]}`,

  [mobileBreakpoint]: {
    flexDirection: 'column-reverse',

    '& .MuiButton-root': {
      width: '100%',
    },
  },
});

export { CloseButton };
