import type { SxProps, SystemStyleObject, Theme } from '@/lib/material';
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
  stabilizeHelper: boolean,
  hasHelperMessage: boolean,
): SystemStyleObject<Theme> {
  const colors = toneStyles[tone];

  return {
    position: 'relative',
    '& .MuiFormHelperText-root': {
      '@keyframes inputHelperIn': {
        from: {
          opacity: 0,
          transform: 'translateY(-2px)',
        },
        to: {
          opacity: 1,
          transform: 'translateY(0)',
        },
      },
      color: colors.helper,
      fontSize: fontSize.xs,
      lineHeight: 1.25,
      marginInline: 0,
      minHeight: stabilizeHelper ? '1.125rem' : undefined,
      mt: spacing[1],
      opacity: stabilizeHelper ? (hasHelperMessage ? 1 : 0) : 1,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      transform: stabilizeHelper
        ? hasHelperMessage
          ? 'translateY(0)'
          : 'translateY(-2px)'
        : undefined,
      transition: 'opacity 0.2s ease, transform 0.2s ease, color 0.2s ease',
      whiteSpace: 'nowrap',
      ...(stabilizeHelper && hasHelperMessage
        ? {
            animation: 'inputHelperIn 0.2s ease',
          }
        : {}),
    },
    '& .MuiInputBase-input': {
      color: colorTokens.textPrimary,
      // iOS Safari zooms focused inputs under 16px; keep readable without pinch-reset.
      fontSize: fontSize.base,
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
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: colors.border,
        borderWidth: '1px',
      },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: colors.focus,
        borderWidth: '1px',
      },
      '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: colors.focus,
      },
      // Ensure the outline legend opens a gap under the floating label.
      '& .MuiOutlinedInput-notchedOutline legend': {
        maxWidth: '100%',
      },
      '& .MuiOutlinedInput-notchedOutline legend > span': {
        paddingLeft: '4px',
        paddingRight: '4px',
      },
    },
  };
}

export function getInputSx({
  consumerSx,
  hasHelperMessage = false,
  inputVariant,
  size,
  stabilizeHelper = false,
  tone,
}: {
  consumerSx?: SxProps<Theme>;
  hasHelperMessage?: boolean;
  inputVariant: InputVariant;
  size: InputSize;
  stabilizeHelper?: boolean;
  tone: InputTone;
}): SxProps<Theme> {
  const inputStyles = getInputStyles(tone, inputVariant, size, stabilizeHelper, hasHelperMessage);

  return consumerSx ? ([inputStyles, consumerSx] as SxProps<Theme>) : [inputStyles];
}
