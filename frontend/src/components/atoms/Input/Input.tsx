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

  return (
    <TextField
      {...restProps}
      error={Boolean(errorMessage)}
      helperText={errorMessage || helperText}
      inputRef={ref}
      size={size}
      variant="outlined"
      slotProps={{
        ...slotProps,
        htmlInput: {
          ...(typeof legacyInputProps === 'object' && legacyInputProps ? legacyInputProps : {}),
          ...(typeof htmlInputSlotProps === 'function' ? {} : htmlInputSlotProps),
        },
        input: {
          ...(typeof inputSlotProps === 'function' ? {} : inputSlotProps),
          endAdornment: endAdornment ? (
            <InputAdornment position="end">{endAdornment}</InputAdornment>
          ) : undefined,
          startAdornment: startAdornment ? (
            <InputAdornment position="start">{startAdornment}</InputAdornment>
          ) : undefined,
        },
        inputLabel: {
          shrink: true,
          ...(typeof inputLabelSlotProps === 'function' ? {} : inputLabelSlotProps),
        },
      }}
      sx={getInputSx({
        consumerSx,
        inputVariant,
        size,
        tone: resolvedTone,
      })}
    />
  );
});
