import { Box, IconButton, SendIcon, TextField, styled } from '@/lib/material';
import { borderRadius, colorTokens, spacing } from '@/tokens';

export const ChatInputRoot = styled(Box)({
  alignItems: 'flex-end',
  background: colorTokens.backgroundCard,
  borderTop: `0.0625rem solid ${colorTokens.borderSubtle}`,
  display: 'flex',
  gap: spacing[2],
  padding: spacing[4],
});

export const ChatTextField = styled(TextField)({
  flex: 1,

  '& .MuiOutlinedInput-root': {
    backgroundColor: colorTokens.actionPrimarySurface,
    borderRadius: borderRadius.xl,
    fontSize: '0.9375rem',
    paddingRight: spacing[1],
  },

  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: colorTokens.borderDefault,
  },

  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: colorTokens.borderHover,
  },

  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: colorTokens.borderFocus,
    borderWidth: '0.0625rem',
  },
});

export const SendButton = styled(IconButton)({
  background: colorTokens.actionPrimaryGradient,
  borderRadius: borderRadius.lg,
  color: colorTokens.textInverse,
  flexShrink: 0,
  height: '2.75rem',
  transition: 'transform 160ms ease, opacity 160ms ease',
  width: '2.75rem',

  '&:hover': {
    background: colorTokens.actionPrimaryHover,
    color: colorTokens.textInverse,
  },

  '&.Mui-disabled': {
    background: colorTokens.borderSubtle,
    color: colorTokens.textTertiary,
  },

  '&:not(.Mui-disabled):active': {
    transform: 'scale(0.96)',
  },
});

export { SendIcon };
