import type { ElementType } from 'react';

import { Box, Typography, styled } from '@/lib/material';
import {
  borderRadius,
  colorTokens,
  fontSize,
  fontWeight,
  iconToneTokens,
  resumeBuilderTokens as t,
  spacing,
  type IconTone,
} from '@/tokens';

export { t, borderRadius, colorTokens, fontSize, fontWeight, spacing };

export const border = `1px solid ${t.border}`;
export const primaryGradient = t.primary;

export const panel = {
  background: t.background,
  border,
  borderRadius: borderRadius['2xl'],
  boxShadow: t.cardShadow,
  boxSizing: 'border-box' as const,
  display: 'grid',
  gap: spacing[3],
  padding: spacing[5],
} as const;

/** Shared outer padding for step panels — aligns with Root inset. */
export const stepPadding = {
  padding: 0,
  '@media (max-width: 48rem)': {
    padding: 0,
  },
} as const;

/** Fixed-height multiline fields with internal scroll. */
export const scrollableMultilineSx = {
  '& .MuiInputBase-root': {
    alignItems: 'flex-start',
    maxHeight: '14rem',
    overflowY: 'auto',
  },
  '& .MuiInputBase-inputMultiline': {
    maxHeight: '12.5rem',
    overflowY: 'auto !important',
    resize: 'none',
  },
} as const;

export const title = {
  color: t.text,
  fontWeight: fontWeight.extraBold,
  letterSpacing: 0,
  margin: 0,
} as const;

export const muted = {
  color: t.textSecondary,
  fontSize: fontSize.sm,
} as const;

export const pill = {
  borderRadius: borderRadius.full,
  display: 'inline-flex',
  fontSize: fontSize.xs,
  fontWeight: fontWeight.extraBold,
  padding: `${spacing[1]} ${spacing[3]}`,
  whiteSpace: 'nowrap' as const,
};

export const iconBox = (size = '2.5rem', tone: IconTone = 'primary') => {
  const iconTone = iconToneTokens[tone];
  return {
    alignItems: 'center',
    background: iconTone.background,
    borderRadius: borderRadius.full,
    color: iconTone.color,
    display: 'flex',
    height: size,
    justifyContent: 'center',
    width: size,
    '& .MuiSvgIcon-root': {
      color: 'inherit',
    },
  };
};

export const tone = {
  error: { background: t.redBadgeBg, border: t.redBadgeBorder, color: t.redBadgeText },
  warning: { background: t.amberBadgeBg, border: t.amberBadgeBorder, color: t.amberBadgeText },
  success: { background: t.greenBadgeBg, border: t.greenBadgeBorder, color: t.greenBadgeText },
} as const;

export type ToneName = keyof typeof tone;

export const CardTitle = styled(Typography)<{ component?: ElementType }>({
  ...title,
  fontSize: fontSize.xl,
});

export const CardSubtitle = styled(Typography)<{ component?: ElementType }>({
  ...muted,
});

export const EmptyText = styled(Typography)<{ component?: ElementType }>({
  ...muted,
});

export const FileTile = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'extension',
})<{ extension: string }>(({ extension }) => {
  const [background, color] =
    extension === 'pdf'
      ? ['linear-gradient(145deg, #FEF2F2, #FFFFFF)', '#EF4444']
      : extension === 'docx'
        ? ['linear-gradient(145deg, #EFF6FF, #FFFFFF)', '#2563EB']
        : ['linear-gradient(145deg, #F3F4F6, #FFFFFF)', '#6B7280'];

  return {
    ...iconBox('3.1rem'),
    background,
    border,
    borderRadius: borderRadius.xl,
    boxShadow: 'none',
    color,
    display: 'grid',
    fontSize: '0.63rem',
    fontWeight: fontWeight.extraBold,
    justifyItems: 'center',
    lineHeight: 1,
    padding: spacing[1],
    textTransform: 'uppercase',
  };
});

export const ScoreBadge = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'score',
})<{ score: number }>(({ score }) => {
  const c = score >= 80 ? tone.success : score >= 60 ? tone.warning : tone.error;
  return {
    ...pill,
    background: c.background,
    border: `1px solid ${c.border}`,
    color: c.color,
    padding: '0.32rem 0.55rem',
  };
});
