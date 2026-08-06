import { Box, styled } from '@/lib/material';
import {
  borderRadius,
  borderWidth,
  colorTokens,
  fontWeight,
  iconToneTokens,
  shadows,
  spacing,
  type IconTone,
} from '@/tokens';

export const LandingRoot = styled('div')({
  background: colorTokens.backgroundApp,
  color: colorTokens.textPrimary,
  maxWidth: '100%',
  minHeight: '100dvh',
  overflowX: 'hidden',
  scrollBehavior: 'smooth',
  scrollPaddingTop: spacing[16],
  width: '100%',
});

export const LandingMain = styled('main')({
  display: 'grid',
  gap: 0,
  maxWidth: '100%',
  minWidth: 0,
  overflowX: 'hidden',
});

export const Section = styled('section')({
  maxWidth: '100%',
  minWidth: 0,
  padding: `${spacing[16]} ${spacing[4]}`,
  width: '100%',

  '@media (max-width: 1023px)': {
    padding: `${spacing[14]} ${spacing[4]}`,
  },

  '@media (max-width: 48rem)': {
    padding: `${spacing[10]} ${spacing[3]}`,
  },

  '@media (max-width: 30rem)': {
    padding: `${spacing[8]} ${spacing[3]}`,
  },
});

export const SectionInner = styled('div')({
  display: 'grid',
  gap: spacing[8],
  margin: '0 auto',
  maxWidth: '72rem',
  minWidth: 0,
  width: '100%',

  '@media (max-width: 48rem)': {
    gap: spacing[6],
  },
});

export const SectionHeader = styled('div')({
  display: 'grid',
  gap: spacing[2],
  justifyItems: 'center',
  margin: '0 auto',
  maxWidth: '42rem',
  textAlign: 'center',
});

export const SectionTitle = styled('h2')({
  color: colorTokens.textPrimary,
  fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
  fontWeight: fontWeight.extraBold,
  letterSpacing: '-0.03em',
  lineHeight: 1.2,
  margin: 0,
  overflowWrap: 'anywhere',
});

export const SectionSubtitle = styled('p')({
  color: colorTokens.textSecondary,
  fontSize: 'clamp(1rem, 2.2vw, 1.125rem)',
  lineHeight: 1.6,
  margin: 0,
  maxWidth: '100%',
});

export const SurfaceCard = styled('article')({
  background: colorTokens.backgroundCard,
  border: `${borderWidth.thin} solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius['2xl'],
  boxShadow: shadows.card,
  minWidth: 0,
  padding: spacing[5],
  transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',

  '@media (max-width: 48rem)': {
    padding: spacing[4],
  },

  '@media (prefers-reduced-motion: reduce)': {
    transition: 'border-color 180ms ease',
  },

  '&:hover': {
    borderColor: colorTokens.borderHover,
    transform: 'translateY(-0.15rem)',
  },
});

export const IconBadge = styled('div', {
  shouldForwardProp: (prop) => prop !== 'tone',
})<{ tone?: IconTone }>(({ tone = 'primary' }) => ({
  alignItems: 'center',
  background: iconToneTokens[tone].background,
  borderRadius: borderRadius.lg,
  color: iconToneTokens[tone].color,
  display: 'inline-grid',
  height: spacing[10],
  justifyItems: 'center',
  width: spacing[10],
}));

export const FadeUp = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'visible',
})<{ visible?: boolean }>(({ visible = true }) => ({
  opacity: visible ? 1 : 0,
  transform: visible ? 'translateY(0)' : 'translateY(1rem)',
  transition: 'opacity 500ms ease, transform 500ms ease',

  '@media (prefers-reduced-motion: reduce)': {
    opacity: 1,
    transform: 'none',
    transition: 'none',
  },
}));
