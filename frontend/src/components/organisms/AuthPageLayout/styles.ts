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

/** Short laptop viewports (e.g. 15" @ 1366×768, 950×650) while in desktop split layout. */
const shortDesktopViewport = '@media (max-height: 56.25rem) and (min-width: 56.25rem)';
/** Below `md` (900px): phones + tablets use a stacked form-first layout. */
const belowDesktop = '@media (max-width: 56.24rem)';

export const AuthRoot = styled(
  Box,
  excludeModeProp,
)<ModeProps>(({ mode, theme }) =>
  theme.unstable_sx([
    {
      background: `radial-gradient(circle at 10% 12%, ${colorTokens.actionPrimarySubtle} 0, transparent ${sizing[26]}), ${colorTokens.backgroundApp}`,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      height: authLayout.viewportHeight,
      overflow: 'hidden',
      position: 'relative',
      px: { xs: spacing[4], sm: spacing[6], md: spacing[8], lg: spacing[10] },
      py: { xs: spacing[3], sm: spacing[4], md: spacing[4] },
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
      display: 'flex',
      flexDirection: 'column',
      height: 'auto',
      minHeight: authLayout.viewportHeight,
      overflow: 'visible',
      WebkitOverflowScrolling: 'touch',
      [theme.breakpoints.up('md')]: {
        background: colorTokens.backgroundApp,
      },
      [belowDesktop]: {
        py: { xs: spacing[4], sm: spacing[5], md: spacing[4] },
        pb: { xs: spacing[4], sm: spacing[5], md: 0 },
      },
    },
    mode === 'register' && {
      display: 'flex',
      flexDirection: 'column',
      height: 'auto',
      minHeight: authLayout.viewportHeight,
      overflow: 'visible',
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
          mb: { xs: spacing[3], md: spacing[3], xl: spacing[4] },
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
          mb: { xs: spacing[2], sm: spacing[2], md: spacing[3] },
          width: '100%',
          [shortDesktopViewport]: {
            mb: spacing[1],
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
      maxWidth: { xs: '9rem', sm: '10rem', md: '9.5rem', lg: '10.5rem' },
      width: '100%',
    },
    mode === 'login' && {
      [shortDesktopViewport]: {
        maxWidth: '8.5rem',
      },
    },
    mode === 'register' && {
      maxWidth: { xs: '7.75rem', sm: '8.5rem', md: '8.75rem', xl: '10rem' },
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
      alignItems: 'center',
      flex: 1,
      gap: { xs: spacing[4], md: spacing[6], lg: spacing[8], xl: spacing[12] },
      gridTemplateColumns: createResponsiveColumns(authLayout.contentColumns),
      margin: '0 auto',
      maxWidth: authLayout.contentMaxWidth,
      minHeight: 0,
      overflow: 'hidden',
      width: '100%',
      [shortDesktopViewport]: {
        gap: spacing[3],
      },
      [belowDesktop]: {
        flex: '0 0 auto',
        height: 'auto',
        maxWidth: { xs: '28rem', sm: '32rem', md: '36rem' },
        minHeight: 0,
        pb: { xs: spacing[4], md: 0 },
      },
    },
    mode === 'login' && {
      [theme.breakpoints.up('md')]: {
        gap: { md: spacing[6], lg: spacing[8], xl: spacing[12] },
        gridTemplateColumns: '1fr 1fr',
        height: 'auto',
        maxWidth: authLayout.contentMaxWidth,
        minHeight: '100%',
        overflow: 'visible',
      },
      [shortDesktopViewport]: {
        gap: spacing[3],
        height: 'auto',
        minHeight: '100%',
      },
      [belowDesktop]: {
        gridTemplateColumns: authLayout.mobileColumn,
      },
    },
    mode === 'register' && {
      [theme.breakpoints.up('md')]: {
        gap: { md: spacing[6], lg: spacing[8], xl: spacing[12] },
        gridTemplateColumns: '1fr 1fr',
        height: 'auto',
        maxWidth: authLayout.contentMaxWidth,
        minHeight: '100%',
        overflow: 'visible',
      },
      [shortDesktopViewport]: {
        gap: spacing[3],
        height: 'auto',
        minHeight: '100%',
      },
      [belowDesktop]: {
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
    {
      ...flexCenter,
      boxSizing: 'border-box',
      height: '100%',
      minHeight: 0,
      minWidth: 0,
      overflow: 'hidden',
      p: { xs: spacing[2], md: spacing[3], lg: spacing[4] },
      width: '100%',
    },
    mode === 'login' && {
      alignItems: 'center',
      alignSelf: 'stretch',
      height: 'auto',
      justifyContent: 'center',
      minHeight: '100%',
      overflow: 'visible',
      WebkitOverflowScrolling: 'touch',
      [theme.breakpoints.up('md')]: {
        alignItems: 'center',
        justifyContent: 'center',
      },
      [shortDesktopViewport]: {
        justifyContent: 'center',
      },
      [belowDesktop]: {
        height: 'auto',
        justifyContent: 'flex-start',
        overflowY: 'auto',
        width: '100%',
      },
    },
    mode === 'register' && {
      alignItems: 'center',
      alignSelf: 'stretch',
      gridColumn: { md: 2 },
      height: 'auto',
      justifyContent: 'center',
      minHeight: '100%',
      overflow: 'visible',
      WebkitOverflowScrolling: 'touch',
      [shortDesktopViewport]: {
        justifyContent: 'center',
      },
      [belowDesktop]: {
        gridColumn: 'auto',
        height: 'auto',
        justifyContent: 'flex-start',
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
        gap: spacing[2],
        '& > form': {
          gap: `${spacing[3]} !important`,
          padding: `${spacing[4]} !important`,
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
        gap: { md: spacing[3], lg: spacing[4], xl: spacing[5] },
        height: 'auto',
        minHeight: 0,
        p: { md: spacing[4], lg: spacing[5], xl: spacing[6] },
      },
      alignContent: 'start',
      maxWidth: 'none',
      [shortDesktopViewport]: {
        alignContent: 'stretch',
        '& > form': {
          gap: `${spacing[2]} !important`,
          height: 'auto',
          minHeight: '100%',
          padding: `${spacing[3]} !important`,
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
  display: { xs: 'grid', md: 'none' },
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
  display: { xs: 'none', md: 'flex' },
  flexDirection: 'column',
  justifyContent: 'center',
  gap: { md: spacing[3], lg: spacing[4], xl: spacing[5] },
  height: '100%',
  minHeight: 0,
  minWidth: 0,
  paddingLeft: 0,
  paddingTop: 0,
});

export const HeroCopy = createStyledBox({
  ...grid,
  gap: spacing[3],
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
  fontSize: { md: fontSize['3xl'], lg: fontSize['5xl'], xl: fontSize['7xl'] },
  letterSpacing: '-0.045em',
  lineHeight: 1.08,
  maxWidth: sizing[30],
  [shortDesktopViewport]: {
    fontSize: fontSize['3xl'],
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
  alignItems: 'center',
  flexShrink: 0,
  justifyContent: 'center',
  maxHeight: { md: '200px', lg: '260px', xl: '320px' },
  minHeight: 0,
  overflow: 'hidden',
  position: 'relative',
  width: '100%',
});

export const LoginIllustration = createStyledImage({
  height: '100%',
  maxHeight: '100%',
  maxWidth: '100%',
  objectFit: 'contain',
  width: 'auto',
});

export const TrustPanel = createStyledBox({
  ...borderedCardSurface,
  bgcolor: colorTokens.backgroundCardTranslucent,
  display: { xs: 'none', md: 'grid' },
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
  display: { xs: 'none', md: 'flex' },
  flexDirection: 'column',
  gap: { md: spacing[3], lg: spacing[4], xl: spacing[6] },
  gridColumn: { md: 1 },
  height: '100%',
  justifyContent: 'center',
  minHeight: 0,
  minWidth: 0,
  overflow: 'hidden',
  p: 0,
  [shortDesktopViewport]: {
    gap: spacing[2],
  },
});

export const RegisterHeroTop = createStyledBox({
  ...grid,
  alignItems: 'center',
  gap: { md: spacing[3], lg: spacing[5], xl: spacing[8] },
  gridTemplateColumns: {
    md: `minmax(0, 1fr) minmax(0, 0.9fr)`,
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
  gap: { md: spacing[2], lg: spacing[4], xl: spacing[6] },
  [shortDesktopViewport]: {
    gap: spacing[2],
  },
});

export const RegisterHeading = createStyledText({
  ...headingBase,
  fontSize: { md: fontSize['2xl'], lg: fontSize['4xl'], xl: fontSize['6xl'] },
  lineHeight: 1.25,
  [shortDesktopViewport]: {
    fontSize: fontSize['2xl'],
  },
});

export const RegisterIllustration = createStyledImage({
  maxHeight: { md: sizing[12.5], lg: sizing[17], xl: sizing[28] },
  mixBlendMode: 'multiply',
  objectFit: 'contain',
  width: '100%',
  [shortDesktopViewport]: {
    maxHeight: sizing[12],
  },
});

export const RegisterFeatureList = createStyledBox({
  ...grid,
  alignItems: 'end',
  gap: spacing[3],
  gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
  [shortDesktopViewport]: {
    gap: spacing[2],
  },
});

export const RegisterFeatureCard = createStyledBox({
  ...borderedCardSurface,
  ...flex,
  ...alignCenter,
  boxShadow: 'none',
  boxSizing: 'border-box',
  flexDirection: 'column',
  gap: spacing[3],
  height: 'auto',
  minHeight: sizing[12],
  justifyContent: 'center',
  minWidth: 0,
  p: { md: spacing[3], lg: spacing[4], xl: spacing[6] },
  textAlign: 'center',
  [shortDesktopViewport]: {
    gap: spacing[1],
    height: 'auto',
    minHeight: '10rem',
    p: spacing[2],
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
