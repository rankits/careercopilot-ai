import InputAdornment from '@mui/material/InputAdornment';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import type { ReactNode } from 'react';

import { borderRadius, spacing } from '@/tokens';

export interface InputProps extends Omit<
  TextFieldProps,
  'error' | 'helperText' | 'size' | 'variant'
> {
  errorMessage?: string;
  helperText?: ReactNode;
  size?: 'small' | 'medium';
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
}

export function Input({
  endAdornment,
  errorMessage,
  helperText,
  size = 'medium',
  startAdornment,
  ...props
}: InputProps) {
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
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: borderRadius.lg,
          minHeight: size === 'small' ? spacing[10] : spacing[12],
        },
        ...props.sx,
      }}
    />
  );
}
