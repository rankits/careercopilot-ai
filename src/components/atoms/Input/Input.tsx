import InputAdornment from '@mui/material/InputAdornment';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import type { ReactNode } from 'react';

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

export function Input({
  endAdornment,
  errorMessage,
  helperText,
  inputVariant = 'outline',
  size = 'medium',
  startAdornment,
  tone = 'default',
  ...props
}: InputProps) {
  const resolvedTone: InputTone = errorMessage ? 'error' : tone;

  return (
    <TextField
      {...props}
      error={Boolean(errorMessage)}
      helperText={errorMessage || helperText}
      size={size}
      variant="outlined"
      slotProps={{
        input: {
          endAdornment: endAdornment ? (
            <InputAdornment position="end">{endAdornment}</InputAdornment>
          ) : undefined,
          startAdornment: startAdornment ? (
            <InputAdornment position="start">{startAdornment}</InputAdornment>
          ) : undefined,
        },
        ...props.slotProps,
      }}
      sx={getInputSx({
        consumerSx: props.sx,
        inputVariant,
        size,
        tone: resolvedTone,
      })}
    />
  );
}
