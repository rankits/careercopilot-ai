import { Box, Link, styled } from '@/lib/material';
import {
  borderRadius,
  borderWidth,
  colorTokens,
  fontSize,
  fontWeight,
  sizing,
  spacing,
  type IconTone,
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
  tone?: IconTone;
}

const excludeModeProp = {
  shouldForwardProp: (prop: PropertyKey) => prop !== 'mode',
};

const excludeFeatureIconProps = {
  shouldForwardProp: (prop: PropertyKey) => prop !== 'size' && prop !== 'tone',
};

/** Short laptop viewports (e.g. 15" @ 1366×768) while still in desktop split layout. */
const shortDesktopViewport = '@media (max-height: 56.25rem) and (min-width: 75rem)';
/** Below MUI `lg` (1200px): phones + tablets use a stacked form-first layout. */
const belowDesktop = '@media (max-width: 74.9375rem)';

export const AuthRoot = styled(
  Box,
  excludeModeProp,
)<ModeProps>(({ mode, theme }) =>
  theme.unstable_sx([
    {
      background: `radial-gradient(circle at 10% 12%, ${colorTokens.actionPrimarySubtle} 0, transparent ${sizing[26]}), ${colorTokens.backgroundApp}`,
      boxSizing: 'border-box',
      height: authLayout.viewportHeight,
      overflow: 'hidden',
      px: { xs: spacing[4], sm: spacing[6], md: spacing[8], lg: spacing[10] },
      py: { xs: spacing[4], sm: spacing[5], md: spacing[6] },
      position: 'relative',
      [shortDesktopViewport]: {
        py: spacing[2],
      },
      [belowDesktop]: {
        height: authLayout.viewportHeight,
        overflowX: 'hidden',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      },
    },
    mode === 'login' && {
      background: colorTokens.backgroundApp,
      [theme.breakpoints.up('lg')]: {
        background: `linear-gradient(90deg, ${colorTokens.backgroundApp} 0 52%, ${colorTokens.backgroundCard} 52% 100%)`,
        px: 0,
        py: 0,
      },
    },
    mode === 'register' && {
      display: 'flex',
      flexDirection: 'column',
      overflowX: 'hidden',
      overflowY: 'auto',
      [belowDesktop]: {
        py: { xs: spacing[4], sm: spacing[5], md: spacing[4] },
        pb: { xs: spacing[4], sm: spacing[5], md: 0 },
      },
      WebkitOverflowScrolling: 'touch',
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
          flexShrink: 0,
          gap: spacing[3],
          margin: '0 auto',
          maxWidth: authLayout.contentMaxWidth,
          mb: { xs: spacing[3], lg: spacing[3], xl: spacing[4] },
          width: '100%',
          [shortDesktopViewport]: {
            mb: spacing[2],
          },
          [belowDesktop]: {
            alignItems: 'center',
            flexWrap: 'nowrap',
            mb: { xs: spacing[3], md: spacing[2] },
          },
        }
      : {
          flexShrink: 0,
          margin: '0 auto',
          maxWidth: authLayout.contentMaxWidth,
          mb: { xs: spacing[3], sm: spacing[4], lg: spacing[4] },
          width: '100%',
          [theme.breakpoints.up('lg')]: {
            boxSizing: 'border-box',
            left: 0,
            margin: 0,
            maxWidth: 'none',
            mb: 0,
            px: spacing[10],
            position: 'absolute',
            top: spacing[3],
            zIndex: 1,
          },
          [shortDesktopViewport]: {
            mb: 0,
          },
          [belowDesktop]: {
            display: 'flex',
            justifyContent: 'center',
          },
        },
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
      maxWidth: { xs: '10rem', sm: '11rem', lg: sizing[12] },
      width: '100%',
    },
    mode === 'login' && {
      [shortDesktopViewport]: {
        maxWidth: '9rem',
      },
    },
    mode === 'register' && {
      maxWidth: { xs: '7.75rem', sm: '8.5rem', lg: '8.75rem', xl: '10rem' },
      [shortDesktopViewport]: {
        maxWidth: '7.5rem',
      },
    },
  ]),
);

export const HeaderLoginText = createStyledText({
  ...bodyText,
  fontSize: { xs: 0, sm: fontSize.sm, md: fontSize.base },
  lineHeight: 1.2,
  whiteSpace: 'nowrap',
});

export const HeaderLoginLink = styled(Link)({
  color: colorTokens.actionPrimary,
  fontSize: fontSize.base,
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
      gap: { xs: spacing[4], md: spacing[6], lg: spacing[8], xl: spacing[12] },
      gridTemplateColumns: createResponsiveColumns(authLayout.contentColumns),
      height: `calc(100% - ${spacing[16]})`,
      margin: '0 auto',
      maxWidth: authLayout.contentMaxWidth,
      minHeight: 0,
      width: '100%',
      [shortDesktopViewport]: {
        height: `calc(100% - ${spacing[12]})`,
      },
      [belowDesktop]: {
        height: 'auto',
        maxWidth: { xs: '28rem', sm: '32rem', md: '36rem' },
        minHeight: 0,
        pb: { xs: spacing[4], md: 0 },
      },
    },
    mode === 'login' && {
      [theme.breakpoints.up('lg')]: {
        gap: 0,
        gridTemplateColumns: '52% 48%',
        height: '100%',
        margin: 0,
        maxWidth: 'none',
      },
      [shortDesktopViewport]: {
        gap: 0,
        height: '100%',
      },
      [belowDesktop]: {
        gridTemplateColumns: authLayout.mobileColumn,
      },
    },
    mode === 'register' && {
      flex: 1,
      height: 'auto',
      gridTemplateColumns: createResponsiveColumns(authLayout.registerColumns),
      [shortDesktopViewport]: {
        gap: spacing[3],
      },
      [belowDesktop]: {
        flex: '0 0 auto',
        gridTemplateColumns: authLayout.mobileColumn,
      },
    },
  ]),
);

export const FormColumn = styled(
  Box,
  excludeModeProp,
)<ModeProps>(({ mode, theme }) =>
  theme.unstable_sx([
    { ...flexCenter, height: '100%', minHeight: 0, minWidth: 0 },
    mode === 'login' && {
      [theme.breakpoints.up('lg')]: {
        boxSizing: 'border-box',
        px: { lg: spacing[6], xl: spacing[10] },
      },
      [shortDesktopViewport]: {
        justifyContent: 'center',
      },
      [belowDesktop]: {
        height: 'auto',
        justifyContent: 'flex-start',
        width: '100%',
      },
    },
    mode === 'register' && {
      alignItems: 'stretch',
      alignSelf: 'stretch',
      height: '100%',
      justifyContent: 'flex-start',
      order: 1,
      [shortDesktopViewport]: {
        justifyContent: 'flex-start',
      },
      [belowDesktop]: {
        height: 'auto',
        order: 0,
        width: '100%',
      },
    },
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
      [shortDesktopViewport]: {
        gap: spacing[3],
        '& > form': {
          gap: `${spacing[4]} !important`,
          padding: `${spacing[5]} !important`,
        },
      },
      [belowDesktop]: {
        maxWidth: '100%',
        '& > form': {
          gap: { xs: spacing[5], sm: spacing[6] },
          p: { xs: spacing[5], sm: spacing[6], md: spacing[8] },
        },
      },
    },
    mode === 'register' && {
      '& > form': {
        gap: { lg: spacing[4], xl: spacing[5] },
        height: 'auto',
        minHeight: 0,
        p: { lg: spacing[5], xl: spacing[6] },
      },
      alignContent: 'start',
      maxWidth: 'none',
      [shortDesktopViewport]: {
        alignContent: 'stretch',
        '& > form': {
          gap: `${spacing[3]} !important`,
          height: 'auto',
          minHeight: '100%',
          padding: `${spacing[4]} !important`,
        },
      },
      [belowDesktop]: {
        '& > form': {
          gap: { xs: spacing[4], sm: spacing[4] },
          height: 'auto',
          minHeight: 0,
          p: { xs: spacing[5], sm: spacing[6], md: spacing[6] },
        },
      },
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

export const MobileLoginIntro = createStyledBox({
  display: { xs: 'grid', lg: 'none' },
  gap: spacing[3],
  justifyItems: 'center',
  mb: { xs: spacing[1], sm: spacing[2] },
  textAlign: 'center',
});

export const MobileLoginHeading = createStyledText({
  ...headingBase,
  fontSize: { xs: fontSize['2xl'], sm: fontSize['3xl'] },
  letterSpacing: '-0.03em',
  lineHeight: 1.2,
  maxWidth: '22rem',
});

export const LoginHeroSection = createStyledBox({
  display: { xs: 'none', lg: 'grid' },
  gap: spacing[5],
  gridTemplateRows: `auto auto minmax(0, 1fr)`,
  height: '100%',
  minHeight: 0,
  minWidth: 0,
  paddingLeft: {
    lg: `calc(${spacing[10]} + ${spacing[8]})`,
    xl: `calc(${spacing[10]} + ${spacing[16]})`,
  },
  paddingTop: { xs: spacing[2], lg: spacing[16] },
  [shortDesktopViewport]: {
    gap: spacing[2],
    paddingTop: spacing[16],
  },
});

export const HeroCopy = createStyledBox({
  ...grid,
  gap: spacing[4],
  [shortDesktopViewport]: {
    gap: spacing[2],
  },
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
  [shortDesktopViewport]: {
    fontSize: fontSize['4xl'],
    lineHeight: 1.15,
  },
});

export const AccentText = createStyledBox({
  color: colorTokens.actionPrimary,
});

export const Description = createStyledText({
  ...bodyText,
  lineHeight: 1.65,
  maxWidth: authLayout.formMaxWidth,
  [shortDesktopViewport]: {
    display: '-webkit-box',
    fontSize: fontSize.sm,
    lineHeight: 1.45,
    overflow: 'hidden',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
  },
});

export const LoginFeatureList = createStyledBox({
  ...grid,
  gap: spacing[4],
  maxWidth: sizing[34],
  [shortDesktopViewport]: {
    display: 'none',
  },
});

export const LoginFeatureItem = createStyledBox({
  ...flex,
  ...alignCenter,
  gap: spacing[3],
});

export const FeatureIcon = styled(
  Box,
  excludeFeatureIconProps,
)<FeatureIconProps>(({ size, tone = 'primary' }) =>
  createIconSurface(size === 'large' ? spacing[14] : spacing[10], {
    shrink: size === 'small',
    tone,
  }),
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
  height: '100%',
  justifyContent: 'center',
  minHeight: 0,
  overflow: 'hidden',
  position: 'relative',
});

export const LoginIllustration = createStyledImage({
  height: '100%',
  maxHeight: '100%',
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
  [shortDesktopViewport]: {
    display: 'none',
  },
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
  gap: { lg: spacing[4], xl: spacing[8] },
  gridTemplateRows: 'minmax(0, 1fr) auto',
  height: '100%',
  minHeight: 0,
  order: 2,
  overflow: 'hidden',
  p: { lg: spacing[8], xl: spacing[10] },
  [shortDesktopViewport]: {
    gap: spacing[3],
    p: spacing[4],
  },
});

export const RegisterHeroTop = createStyledBox({
  ...grid,
  alignItems: 'center',
  gap: { lg: spacing[5], xl: spacing[8] },
  gridTemplateColumns: {
    lg: `minmax(${sizing[17]}, 1fr) minmax(${sizing[15]}, 0.95fr)`,
    xl: `minmax(${sizing[20]}, 1fr) minmax(${sizing[22]}, 1.25fr)`,
  },
  minHeight: 0,
  overflow: 'hidden',
  [shortDesktopViewport]: {
    gap: spacing[2],
  },
});

export const RegisterCopy = createStyledBox({
  ...grid,
  alignSelf: 'center',
  gap: { lg: spacing[4], xl: spacing[6] },
  [shortDesktopViewport]: {
    gap: spacing[2],
  },
});

export const RegisterHeading = createStyledText({
  ...headingBase,
  fontSize: { lg: fontSize['4xl'], xl: fontSize['6xl'] },
  lineHeight: 1.25,
  [shortDesktopViewport]: {
    fontSize: fontSize['3xl'],
  },
});

export const RegisterIllustration = createStyledImage({
  maxHeight: { lg: sizing[17], xl: sizing[28] },
  objectFit: 'contain',
  width: '100%',
  [shortDesktopViewport]: {
    maxHeight: sizing[15],
  },
});

export const RegisterFeatureList = createStyledBox({
  ...grid,
  alignItems: 'end',
  gap: spacing[4],
  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
  [shortDesktopViewport]: {
    gap: spacing[3],
  },
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
  p: { lg: spacing[4], xl: spacing[6] },
  textAlign: 'center',
  [shortDesktopViewport]: {
    gap: spacing[2],
    height: 'auto',
    minHeight: sizing[12],
    p: spacing[3],
  },
});

export const RegisterFeatureDescription = createStyledText({
  ...secondaryText,
  fontSize: fontSize.sm,
  lineHeight: 1.6,
  [shortDesktopViewport]: {
    fontSize: fontSize.xs,
    lineHeight: 1.4,
  },
});
