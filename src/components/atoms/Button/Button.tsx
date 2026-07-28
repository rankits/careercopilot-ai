import MuiButton, { type ButtonProps as MuiButtonProps } from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

import { getButtonSx, type ButtonSize, type ButtonTone, type ButtonVariant } from './styles';

export interface ButtonProps extends Omit<
  MuiButtonProps,
  'color' | 'size' | 'variant' | 'disableElevation'
> {
  isLoading?: boolean;
  tone?: ButtonTone;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

export function Button({
  children,
  disabled,
  isLoading = false,
  size = 'medium',
  startIcon,
  tone = 'primary',
  variant = 'solid',
  ...props
}: ButtonProps) {
  return (
    <MuiButton
      {...props}
      disableElevation
      disabled={disabled || isLoading}
      variant={variant === 'solid' ? 'contained' : variant === 'outline' ? 'outlined' : 'text'}
      startIcon={isLoading ? <CircularProgress color="inherit" size={16} /> : startIcon}
      sx={getButtonSx({ consumerSx: props.sx, size, tone, variant })}
    >
      {children}
    </MuiButton>
  );
}
