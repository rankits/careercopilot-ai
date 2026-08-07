import SendIcon from '@mui/icons-material/Send';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import { styled } from '@mui/material/styles';
import TextField from '@mui/material/TextField';

import { borderRadius, colorTokens, spacing } from '@/tokens';

const CHAT_INPUT_CONTROL_SIZE = '2.75rem';

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
  minWidth: 0,

  '& .MuiOutlinedInput-root': {
    alignItems: 'center',
    backgroundColor: colorTokens.actionPrimarySurface,
    borderRadius: borderRadius.xl,
    fontSize: '0.9375rem',
    minHeight: CHAT_INPUT_CONTROL_SIZE,
    padding: `0.375rem ${spacing[3]}`,
  },

  '& .MuiOutlinedInput-inputMultiline': {
    lineHeight: 1.5,
    minHeight: '1.375rem',
    padding: 0,
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
  alignSelf: 'flex-end',
  background: colorTokens.actionPrimaryGradient,
  borderRadius: borderRadius.lg,
  color: colorTokens.textInverse,
  flexShrink: 0,
  height: CHAT_INPUT_CONTROL_SIZE,
  padding: 0,
  transition: 'transform 160ms ease, opacity 160ms ease',
  width: CHAT_INPUT_CONTROL_SIZE,

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
