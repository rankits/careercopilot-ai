import MuiButton, { type ButtonProps as MuiButtonProps } from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

import { borderRadius, fontWeight, spacing } from '@/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';
type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends Omit<
  MuiButtonProps,
  'color' | 'size' | 'variant' | 'disableElevation'
> {
  isLoading?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

const variantMap: Record<ButtonVariant, Pick<MuiButtonProps, 'color' | 'variant'>> = {
  danger: { color: 'error', variant: 'contained' },
  primary: { color: 'primary', variant: 'contained' },
  secondary: { color: 'primary', variant: 'outlined' },
  tertiary: { color: 'primary', variant: 'text' },
};

export function Button({
  children,
  disabled,
  isLoading = false,
  size = 'medium',
  startIcon,
  variant = 'primary',
  ...props
}: ButtonProps) {
  const mappedVariant = variantMap[variant];

  return (
    <MuiButton
      {...props}
      {...mappedVariant}
      disableElevation
      disabled={disabled || isLoading}
      size={size}
      startIcon={isLoading ? <CircularProgress color="inherit" size={16} /> : startIcon}
      sx={{
        borderRadius: borderRadius.lg,
        fontWeight: fontWeight.bold,
        minHeight: size === 'large' ? spacing[12] : size === 'small' ? spacing[8] : spacing[10],
        px: size === 'large' ? 3 : 2.5,
        textTransform: 'none',
        ...props.sx,
      }}
    >
      {children}
    </MuiButton>
  );
}
