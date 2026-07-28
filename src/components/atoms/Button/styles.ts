import type { SxProps, SystemStyleObject, Theme } from '@/lib/material';
import { borderRadius, colorTokens, fontSize, fontWeight, spacing } from '@/tokens';

export type ButtonTone = 'primary' | 'success' | 'danger';
export type ButtonVariant = 'solid' | 'outline' | 'ghost';
export type ButtonSize = 'extraSmall' | 'small' | 'medium' | 'large' | 'extraLarge';

const toneStyles: Record<
  ButtonTone,
  { base: string; hover: string; active: string; surface: string }
> = {
  danger: {
    active: colorTokens.actionDangerHover,
    base: colorTokens.actionDanger,
    hover: colorTokens.actionDangerHover,
    surface: colorTokens.actionDangerSurface,
  },
  primary: {
    active: colorTokens.actionPrimaryActive,
    base: colorTokens.actionPrimary,
    hover: colorTokens.actionPrimaryHover,
    surface: colorTokens.actionPrimarySubtle,
  },
  success: {
    active: colorTokens.actionSuccessHover,
    base: colorTokens.actionSuccess,
    hover: colorTokens.actionSuccessHover,
    surface: colorTokens.actionSuccessSurface,
  },
};

const sizeStyles: Record<ButtonSize, { fontSize: string; minHeight: string; paddingX: string }> = {
  extraLarge: { fontSize: fontSize.lg, minHeight: spacing[14], paddingX: spacing[8] },
  extraSmall: { fontSize: fontSize.xs, minHeight: spacing[8], paddingX: spacing[4] },
  large: { fontSize: fontSize.base, minHeight: spacing[12], paddingX: spacing[6] },
  medium: { fontSize: fontSize.sm, minHeight: spacing[10], paddingX: spacing[6] },
  small: { fontSize: fontSize.xs, minHeight: spacing[8], paddingX: spacing[5] },
};

function getVariantStyles(tone: ButtonTone, variant: ButtonVariant): SystemStyleObject<Theme> {
  const colors = toneStyles[tone];

  if (variant === 'outline') {
    return {
      '&:active': {
        bgcolor: colors.surface,
        borderColor: colors.active,
        color: colors.active,
      },
      '&:hover': {
        bgcolor: colors.surface,
        borderColor: colors.hover,
      },
      bgcolor: 'transparent',
      borderColor: colors.base,
      color: colors.base,
    };
  }

  if (variant === 'ghost') {
    return {
      '&:active': {
        bgcolor: colors.surface,
        color: colors.active,
      },
      '&:hover': {
        bgcolor: colors.surface,
      },
      bgcolor: 'transparent',
      borderColor: 'transparent',
      color: colors.base,
    };
  }

  return {
    '&:active': {
      bgcolor: colors.active,
    },
    '&:hover': {
      bgcolor: colors.hover,
    },
    bgcolor: colors.base,
    borderColor: colors.base,
    color: colorTokens.textInverse,
  };
}

function getBaseStyles(size: ButtonSize, variant: ButtonVariant): SystemStyleObject<Theme> {
  const selectedSize = sizeStyles[size];

  return {
    '&.Mui-disabled': {
      bgcolor: variant === 'solid' ? colorTokens.actionPrimarySubtle : 'transparent',
      borderColor: variant === 'ghost' ? 'transparent' : colorTokens.borderSubtle,
      color: colorTokens.textTertiary,
    },
    borderRadius: borderRadius.lg,
    borderStyle: 'solid',
    borderWidth: variant === 'ghost' ? 0 : '0.0625rem',
    fontSize: selectedSize.fontSize,
    fontWeight: fontWeight.bold,
    gap: spacing[2],
    minHeight: selectedSize.minHeight,
    px: selectedSize.paddingX,
    textTransform: 'none',
  };
}

export function getButtonSx({
  consumerSx,
  size,
  tone,
  variant,
}: {
  consumerSx?: SxProps<Theme>;
  size: ButtonSize;
  tone: ButtonTone;
  variant: ButtonVariant;
}): SxProps<Theme> {
  const styles = [getBaseStyles(size, variant), getVariantStyles(tone, variant)];

  return consumerSx ? ([...styles, consumerSx] as SxProps<Theme>) : styles;
}
