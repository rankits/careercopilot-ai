import { forwardRef, type ReactNode } from 'react';

import { InputAdornment, TextField, type TextFieldProps } from '@/lib/material';

import { getInputSx, type InputSize, type InputTone, type InputVariant } from './styles';

export interface InputProps extends Omit<
  TextFieldProps,
  'color' | 'error' | 'helperText' | 'size' | 'variant'
> {
  errorMessage?: string;
  helperText?: ReactNode;
  inputVariant?: InputVariant;
  /** Keeps helper-text height reserved so error show/hide does not jump the layout. */
  stabilizeHelper?: boolean;
  size?: InputSize;
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
  tone?: InputTone;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    endAdornment,
    errorMessage,
    helperText,
    inputVariant = 'outline',
    size = 'medium',
    stabilizeHelper = false,
    startAdornment,
    tone = 'default',
    ...props
  },
  ref,
) {
  const resolvedTone: InputTone = errorMessage ? 'error' : tone;
  const { inputProps: legacyInputProps, slotProps, sx: consumerSx, ...restProps } = props;
  const inputLabelSlotProps = slotProps?.inputLabel;
  const htmlInputSlotProps = slotProps?.htmlInput;
  const inputSlotProps = slotProps?.input;
  const hasMessage = Boolean(errorMessage || helperText);
  const resolvedHelperText = stabilizeHelper
    ? errorMessage || helperText || '\u00a0'
    : errorMessage || helperText;

  return (
    <TextField
      {...restProps}
      error={Boolean(errorMessage)}
      helperText={resolvedHelperText}
      inputRef={ref}
      size={size}
      variant="outlined"
      slotProps={{
        ...slotProps,
        formHelperText: {
          ...(typeof slotProps?.formHelperText === 'object' ? slotProps.formHelperText : {}),
          'aria-hidden': stabilizeHelper && !hasMessage ? true : undefined,
        },
        htmlInput: {
          ...(typeof legacyInputProps === 'object' && legacyInputProps ? legacyInputProps : {}),
          ...(typeof htmlInputSlotProps === 'function' ? {} : htmlInputSlotProps),
        },
        input: {
          ...(typeof inputSlotProps === 'function' ? {} : inputSlotProps),
          ...(endAdornment
            ? {
                endAdornment: <InputAdornment position="end">{endAdornment}</InputAdornment>,
              }
            : {}),
          ...(startAdornment
            ? {
                startAdornment: <InputAdornment position="start">{startAdornment}</InputAdornment>,
              }
            : {}),
        },
        inputLabel: {
          shrink: true,
          ...(typeof inputLabelSlotProps === 'function' ? {} : inputLabelSlotProps),
        },
      }}
      sx={getInputSx({
        consumerSx,
        hasHelperMessage: hasMessage,
        inputVariant,
        size,
        stabilizeHelper,
        tone: resolvedTone,
      })}
    />
  );
});
