import type { SxProps, Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';

import { borderRadius, colorTokens, fontSize, spacing } from '@/tokens';

export type InputTone = 'default' | 'success' | 'error' | 'warning';
export type InputVariant = 'outline' | 'filled';
export type InputSize = 'small' | 'medium';

const toneStyles: Record<
  InputTone,
  { border: string; focus: string; helper: string; surface: string }
> = {
  default: {
    border: colorTokens.borderDefault,
    focus: colorTokens.borderFocus,
    helper: colorTokens.textSecondary,
    surface: colorTokens.backgroundCard,
  },
  error: {
    border: colorTokens.feedbackError,
    focus: colorTokens.feedbackError,
    helper: colorTokens.feedbackError,
    surface: colorTokens.feedbackErrorSurface,
  },
  success: {
    border: colorTokens.borderSuccess,
    focus: colorTokens.borderSuccess,
    helper: colorTokens.feedbackSuccess,
    surface: colorTokens.feedbackSuccessSurface,
  },
  warning: {
    border: colorTokens.borderWarning,
    focus: colorTokens.borderWarning,
    helper: colorTokens.feedbackWarning,
    surface: colorTokens.backgroundCard,
  },
};

function getInputStyles(
  tone: InputTone,
  inputVariant: InputVariant,
  size: InputSize,
): SystemStyleObject<Theme> {
  const colors = toneStyles[tone];

  return {
    '& .MuiFormHelperText-root': {
      color: colors.helper,
      fontSize: fontSize.xs,
      marginInline: 0,
      mt: spacing[2],
    },
    '& .MuiInputBase-input': {
      color: colorTokens.textPrimary,
      fontSize: fontSize.sm,
      paddingBlock: 0,
      '&::placeholder': {
        color: colorTokens.textTertiary,
        opacity: 1,
      },
    },
    '& .MuiInputAdornment-root': {
      color: colorTokens.textSecondary,
    },
    '& .MuiOutlinedInput-root': {
      bgcolor: inputVariant === 'filled' ? colorTokens.backgroundApp : colors.surface,
      borderRadius: borderRadius.lg,
      minHeight: size === 'small' ? spacing[10] : spacing[12],
      '&.Mui-disabled': {
        bgcolor: colorTokens.backgroundApp,
      },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: colors.focus,
        borderWidth: '0.125rem',
      },
      '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: colors.focus,
      },
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: colors.border,
      },
    },
  };
}

export function getInputSx({
  consumerSx,
  inputVariant,
  size,
  tone,
}: {
  consumerSx?: SxProps<Theme>;
  inputVariant: InputVariant;
  size: InputSize;
  tone: InputTone;
}): SxProps<Theme> {
  const inputStyles = getInputStyles(tone, inputVariant, size);

  return consumerSx ? ([inputStyles, consumerSx] as SxProps<Theme>) : [inputStyles];
}
