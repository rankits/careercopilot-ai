import { Box, Link, styled } from '@/lib/material';
import {
  borderRadius,
  borderWidth,
  colorTokens,
  fontSize,
  fontWeight,
  sizing,
  spacing,
} from '@/tokens';

import {
  alignCenter,
  authLayout,
  bodyText,
  borderedCardSurface,
  createIconSurface,
  createResponsiveColumns,
  createStyledBox,
  createStyledImage,
  createStyledText,
  elevatedSurface,
  featureTitleBase,
  flex,
  flexBetween,
  flexCenter,
  grid,
  headingBase,
  secondaryText,
} from './stylePrimitives';

export type AuthPageMode = 'login' | 'register';

interface ModeProps {
  mode: AuthPageMode;
}

interface FeatureIconProps {
  size: 'large' | 'small';
}

const excludeModeProp = {
  shouldForwardProp: (prop: PropertyKey) => prop !== 'mode',
};

const excludeSizeProp = {
  shouldForwardProp: (prop: PropertyKey) => prop !== 'size',
};

export const AuthRoot = styled(
  Box,
  excludeModeProp,
)<ModeProps>(({ mode, theme }) =>
  theme.unstable_sx([
    {
      background: `radial-gradient(circle at 10% 12%, ${colorTokens.actionPrimarySubtle} 0, transparent ${sizing[26]}), ${colorTokens.backgroundApp}`,
      boxSizing: 'border-box',
      height: authLayout.viewportHeight,
      overflow: 'auto',
      px: { xs: spacing[4], sm: spacing[6], lg: spacing[10] },
      py: { xs: spacing[4], md: spacing[6] },
      position: 'relative',
    },
    mode === 'login' && {
      '@media (max-width: 1199.95px)': { overflow: 'auto' },
      background: `linear-gradient(90deg, ${colorTokens.backgroundApp} 0 52%, ${colorTokens.backgroundCard} 52% 100%)`,
      overflow: 'hidden',
    },
    mode === 'register' && {
      WebkitOverflowScrolling: 'touch',
      height: authLayout.viewportHeight,
      minHeight: 0,
      overflowX: 'hidden',
      overflowY: { xs: 'auto', lg: 'hidden' },
      overscrollBehaviorY: 'contain',
    },
  ]),
);

export const AuthHeader = styled(
  Box,
  excludeModeProp,
)<ModeProps>(({ mode, theme }) =>
  theme.unstable_sx(
    mode === 'register'
      ? {
          ...flexBetween,
          margin: '0 auto',
          maxWidth: authLayout.contentMaxWidth,
        }
      : {},
  ),
);

export const LogoImage = styled(
  'img',
  excludeModeProp,
)<ModeProps>(({ mode, theme }) =>
  theme.unstable_sx([
    {
      display: 'block',
      height: 'auto',
      mb: spacing[4],
      maxWidth: sizing[12],
      width: '100%',
    },
    mode === 'login' && {
      left: { xs: spacing[4], sm: spacing[6], lg: spacing[10] },
      position: 'absolute',
      top: { xs: spacing[4], md: spacing[6] },
      zIndex: 2,
    },
  ]),
);

export const HeaderLoginText = createStyledText(bodyText);

export const HeaderLoginLink = styled(Link)({
  color: colorTokens.actionPrimary,
  fontWeight: fontWeight.bold,
  textDecoration: 'none',
});

export const AuthContent = styled(
  Box,
  excludeModeProp,
)<ModeProps>(({ mode, theme }) =>
  theme.unstable_sx([
    {
      ...grid,
      gap: { lg: spacing[8], xl: spacing[12] },
      gridTemplateColumns: createResponsiveColumns(authLayout.contentColumns),
      margin: '0 auto',
      maxWidth: authLayout.contentMaxWidth,
      minHeight: `calc(100dvh - ${spacing[28]})`,
    },
    mode === 'login' && { height: '100%', minHeight: 0 },
    mode === 'register' && {
      gridTemplateColumns: createResponsiveColumns(authLayout.registerColumns),
      height: { lg: `calc(100dvh - ${spacing[36]})` },
      minHeight: { lg: 0 },
    },
  ]),
);

export const FormColumn = styled(
  Box,
  excludeModeProp,
)<ModeProps>(({ mode, theme }) =>
  theme.unstable_sx([
    { ...flexCenter, minWidth: 0 },
    mode === 'register' && { alignItems: 'stretch', order: 1 },
  ]),
);

export const FormStack = styled(
  Box,
  excludeModeProp,
)<ModeProps>(({ mode, theme }) =>
  theme.unstable_sx([
    {
      ...grid,
      gap: spacing[4],
      maxWidth: authLayout.formMaxWidth,
      minWidth: 0,
      width: '100%',
    },
    mode === 'register' && {
      '& > form': {
        gap: { lg: spacing[4], xl: spacing[5] },
        height: '100%',
        p: { lg: spacing[5], xl: spacing[6] },
      },
      maxWidth: 'none',
    },
  ]),
);

export const ErrorAlert = createStyledBox({
  bgcolor: colorTokens.feedbackErrorSurface,
  border: `${borderWidth.thin} solid ${colorTokens.feedbackError}`,
  borderRadius: borderRadius.lg,
  color: colorTokens.feedbackError,
  px: spacing[4],
  py: spacing[3],
});

export const LoginHeroSection = createStyledBox({
  ...grid,
  gap: spacing[5],
  gridTemplateRows: `auto auto minmax(${sizing[17]}, 1fr)`,
  minWidth: 0,
  paddingLeft: { lg: spacing[8], xl: spacing[16] },
  paddingTop: spacing[22],
});

export const HeroCopy = createStyledBox({
  ...grid,
  gap: spacing[4],
});

export const AiBadge = createStyledBox({
  ...alignCenter,
  bgcolor: colorTokens.actionPrimarySubtle,
  borderRadius: borderRadius.full,
  color: colorTokens.actionPrimary,
  display: 'inline-flex',
  fontSize: fontSize.xs,
  fontWeight: fontWeight.bold,
  gap: spacing[2],
  px: spacing[3],
  py: spacing[2],
  width: 'fit-content',
});

export const HeroHeading = createStyledText({
  ...headingBase,
  fontSize: { md: fontSize['5xl'], xl: fontSize['7xl'] },
  letterSpacing: '-0.045em',
  lineHeight: 1.08,
  maxWidth: sizing[30],
});

export const AccentText = createStyledBox({
  color: colorTokens.actionPrimary,
});

export const Description = createStyledText({
  ...bodyText,
  lineHeight: 1.65,
  maxWidth: authLayout.formMaxWidth,
});

export const LoginFeatureList = createStyledBox({
  ...grid,
  gap: spacing[4],
  maxWidth: sizing[34],
});

export const LoginFeatureItem = createStyledBox({
  ...flex,
  ...alignCenter,
  gap: spacing[3],
});

export const FeatureIcon = styled(
  Box,
  excludeSizeProp,
)<FeatureIconProps>(({ size }) =>
  createIconSurface(size === 'large' ? spacing[14] : spacing[10], size === 'small'),
);

export const FeatureTitle = createStyledText({
  ...featureTitleBase,
});

export const FeatureDescription = createStyledText({
  ...secondaryText,
  fontSize: fontSize.xs,
  mt: spacing[1],
});

export const LoginVisual = createStyledBox({
  ...flex,
  alignItems: 'flex-end',
  justifyContent: 'center',
  minHeight: sizing[15],
  overflow: 'hidden',
  position: 'relative',
});

export const LoginIllustration = createStyledImage({
  height: '100%',
  maxWidth: sizing[40],
  objectFit: 'contain',
  width: '100%',
});

export const TrustPanel = createStyledBox({
  ...borderedCardSurface,
  bgcolor: colorTokens.backgroundCardTranslucent,
  display: { xs: 'none', lg: 'grid' },
  gap: spacing[3],
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  p: spacing[4],
});

export const TrustItem = createStyledBox({
  ...flex,
  ...alignCenter,
  gap: spacing[3],
  minWidth: 0,
});

export const RegisterPanel = createStyledBox({
  ...borderedCardSurface,
  display: { xs: 'none', lg: 'grid' },
  gap: spacing[8],
  gridTemplateRows: 'minmax(0, 1fr) auto',
  order: 2,
  p: { lg: spacing[8], xl: spacing[10] },
});

export const RegisterHeroTop = createStyledBox({
  ...grid,
  gap: spacing[4],
  gridTemplateColumns: {
    lg: authLayout.mobileColumn,
    xl: `minmax(${sizing[20]}, 1fr) minmax(${sizing[22]}, 1.35fr)`,
  },
  minHeight: 0,
});

export const RegisterCopy = createStyledBox({
  ...grid,
  alignSelf: 'center',
  gap: spacing[6],
});

export const RegisterHeading = createStyledText({
  ...headingBase,
  fontSize: { lg: fontSize['4xl'], xl: fontSize['6xl'] },
  lineHeight: 1.25,
});

export const RegisterIllustration = createStyledImage({
  maxHeight: sizing[28],
  objectFit: 'contain',
  width: '100%',
});

export const RegisterFeatureList = createStyledBox({
  ...grid,
  alignItems: 'end',
  gap: spacing[4],
  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
});

export const RegisterFeatureCard = createStyledBox({
  ...elevatedSurface,
  ...flex,
  ...alignCenter,
  boxSizing: 'border-box',
  flexDirection: 'column',
  gap: spacing[4],
  height: sizing[12.5],
  justifyContent: 'center',
  minWidth: 0,
  p: spacing[6],
  textAlign: 'center',
});

export const RegisterFeatureDescription = createStyledText({
  ...secondaryText,
  fontSize: fontSize.sm,
  lineHeight: 1.6,
});
