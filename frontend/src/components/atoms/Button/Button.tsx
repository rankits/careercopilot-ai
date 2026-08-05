import type { ElementType } from 'react';

import { CircularProgress, MuiButton, type MuiButtonProps } from '@/lib/material';

import {
  getButtonSx,
  type ButtonSize,
  type ButtonTone,
  type ButtonVariant,
} from './styles';

/** Maps the design-system variant to the underlying MUI Button variant. */
const BUTTON_VARIANT_MAP: Record<ButtonVariant, MuiButtonProps['variant']> = {
  ghost: 'text',
  outline: 'outlined',
  solid: 'contained',
};

export interface ButtonProps extends Omit<
  MuiButtonProps,
  'color' | 'size' | 'variant' | 'disableElevation'
> {
  component?: ElementType;
  href?: string;
  isLoading?: boolean;
  rel?: string;
  size?: ButtonSize;
  target?: string;
  to?: string;
  tone?: ButtonTone;
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
      variant={BUTTON_VARIANT_MAP[variant]}
      startIcon={isLoading ? <CircularProgress color="inherit" size={16} /> : startIcon}
      sx={getButtonSx({ consumerSx: props.sx, size, tone, variant })}
    >
      {children}
    </MuiButton>
  );
}
