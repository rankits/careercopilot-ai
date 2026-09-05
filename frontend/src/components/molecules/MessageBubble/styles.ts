import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { ElementType } from 'react';

import { borderRadius, colorTokens, fontSize, fontWeight, spacing } from '@/tokens';

export const MessageRow = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isUser',
})<{ isUser: boolean }>(({ isUser }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: spacing[1],
  maxWidth: '100%',
  paddingInline: spacing[1],
  ...(isUser ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }),
}));

export const MessageBubbleSurface = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isUser' && prop !== 'isError',
})<{ isError?: boolean; isUser: boolean }>(({ isError, isUser }) => ({
  background: isUser
    ? colorTokens.actionPrimaryGradient
    : isError
      ? colorTokens.feedbackErrorSurface
      : colorTokens.actionPrimarySurface,
  border: isUser
    ? 'none'
    : `0.0625rem solid ${isError ? colorTokens.feedbackError : colorTokens.borderSubtle}`,
  borderRadius: isUser
    ? `${borderRadius.xl} ${borderRadius.xl} ${borderRadius.sm} ${borderRadius.xl}`
    : `${borderRadius.xl} ${borderRadius.xl} ${borderRadius.xl} ${borderRadius.sm}`,
  boxShadow: isUser ? '0 8px 20px rgba(37, 99, 235, 0.18)' : 'none',
  color: isUser
    ? colorTokens.textInverse
    : isError
      ? colorTokens.feedbackError
      : colorTokens.textPrimary,
  maxWidth: 'min(100%, 26rem)',
  padding: `${spacing[3]} ${spacing[4]}`,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}));

export const MessageText = styled(Typography)<{ component?: ElementType }>({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  lineHeight: 1.55,
});

export const MessageTimestamp = styled(Typography)<{ component?: ElementType; dateTime?: string }>({
  color: colorTokens.textTertiary,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
  paddingInline: spacing[1],
});
