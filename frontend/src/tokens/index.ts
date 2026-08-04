export const palette = {
  blue50: '#EFF6FF',
  blue100: '#DBEAFE',
  blue500: '#60A5FA',
  blue600: '#2563EB',
  blue700: '#1D4ED8',
  blue800: '#1E40AF',
  green50: '#CCFBF1',
  green100: '#CCFBF1',
  green600: '#14B8A6',
  green700: '#0D9488',
  red50: '#fef2f2',
  red100: '#fee2e2',
  red500: '#EF4444',
  red600: '#EF4444',
  red700: '#b91c1c',
  orange500: '#FBBF24',
  gray0: '#ffffff',
  gray50: '#F8FAFC',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#475569',
  gray800: '#1c2440',
  gray900: '#0F172A',
} as const;

export const colorTokens = {
  actionPrimary: palette.blue600,
  actionPrimaryGradient: palette.blue600,
  actionPrimaryHover: palette.blue700,
  actionPrimaryActive: palette.blue800,
  actionPrimarySurface: palette.blue50,
  actionPrimarySubtle: palette.blue100,
  actionDanger: palette.red600,
  actionDangerHover: palette.red700,
  actionDangerSurface: palette.red50,
  actionGhostHover: palette.blue50,
  actionSuccess: palette.green600,
  actionSuccessHover: palette.green700,
  actionSuccessSurface: palette.green50,
  backgroundApp: '#F8FAFC',
  backgroundCard: palette.gray0,
  backgroundCardTranslucent: 'rgba(255, 255, 255, 0.82)',
  borderDefault: '#E2E8F0',
  borderFocus: palette.blue600,
  borderHover: palette.blue500,
  borderSubtle: palette.gray200,
  borderSuccess: palette.green600,
  borderWarning: palette.orange500,
  feedbackError: palette.red600,
  feedbackErrorSurface: palette.red50,
  feedbackSuccess: palette.green600,
  feedbackSuccessSurface: palette.green50,
  feedbackWarning: palette.orange500,
  note: {
    general: { accent: palette.blue600, background: palette.blue50, color: palette.blue700 },
    interview: { accent: palette.blue500, background: palette.blue50, color: palette.blue600 },
    offer: { accent: palette.orange500, background: '#FEF3C7', color: '#92400E' },
    preparation: { accent: palette.blue700, background: palette.blue100, color: palette.blue800 },
    recruiter: { accent: palette.green600, background: palette.green50, color: '#0F766E' },
    rejection: { accent: palette.red600, background: palette.red50, color: palette.red700 },
  },
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#64748B',
  textInverse: palette.gray0,
} as const;

export const jobFeedTokens = {
  badgeBackground: palette.gray100,
  badgeText: palette.gray700,
  companyLogoSurface: palette.gray50,
  filterActiveBackground: colorTokens.actionPrimary,
  filterBackground: colorTokens.backgroundCard,
  jobCardAccent: colorTokens.actionPrimary,
  matchBackground: colorTokens.feedbackSuccessSurface,
  matchText: '#0F766E',
  scrollbarThumb: palette.gray300,
  scrollbarTrack: palette.gray100,
  skillBackground: palette.gray100,
  skillText: palette.gray700,
  verifiedIcon: palette.blue600,
} as const;

export const spacing = {
  0: '0rem',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  22: '5.5rem',
  28: '7rem',
  36: '9rem',
} as const;

export const fontFamily = {
  sans: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
} as const;

export const fontSize = {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
  '4xl': '2.5rem',
  '5xl': '2.75rem',
  '6xl': '3rem',
  '7xl': '3.25rem',
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semiBold: 600,
  bold: 700,
  extraBold: 800,
} as const;

export const borderRadius = {
  sm: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  full: '9999px',
} as const;

export const borderWidth = {
  thin: '0.0625rem',
} as const;

export const sizing = {
  12: '12rem',
  12.5: '12.5rem',
  15: '15rem',
  17: '17rem',
  20: '20rem',
  22: '22rem',
  26: '26rem',
  28: '28rem',
  30: '30rem',
  34: '34rem',
  38: '38rem',
  40: '40rem',
  100: '100rem',
} as const;

export const shadows = {
  card: '0 20px 70px rgba(15, 23, 42, 0.06)',
  focus: '0 0 0 3px rgba(37, 99, 235, 0.18)',
} as const;

/** Soft circular icon surfaces — tinted bg + matching glyph color (no shadow). */
export type IconTone = 'primary' | 'success' | 'warning';

export const iconToneTokens = {
  primary: {
    background: palette.blue100,
    color: palette.blue600,
  },
  success: {
    background: palette.green50,
    color: palette.green600,
  },
  warning: {
    background: '#FEF3C7',
    color: '#D97706',
  },
} as const;

export const resumeBuilderTokens = {
  primary: '#2563EB',
  primaryHover: '#1D4ED8',
  primarySoft: '#EFF6FF',
  primarySofter: '#DBEAFE',
  background: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  surface: '#FFFFFF',
  surfaceSubtle: '#F8FAFC',
  greenBadgeBg: '#CCFBF1',
  greenBadgeBorder: '#99F6E4',
  greenBadgeText: '#0F766E',
  amberBadgeBg: '#FEF3C7',
  amberBadgeBorder: '#FDE68A',
  amberBadgeText: '#92400E',
  redBadgeBg: '#FEF2F2',
  redBadgeBorder: '#FECACA',
  redBadgeText: '#EF4444',
  rowShadow: '0 12px 34px rgba(17,24,39,0.07)',
  cardShadow: '0 16px 48px rgba(17,24,39,0.055)',
  purpleShadow: '0 12px 32px rgba(37,99,235,0.16)',
  buttonShadow: '0 10px 24px rgba(37,99,235,0.2)',
} as const;

export const tokens = {
  borderRadius,
  borderWidth,
  color: colorTokens,
  fontFamily,
  fontSize,
  fontWeight,
  iconTone: iconToneTokens,
  jobFeed: jobFeedTokens,
  palette,
  resumeBuilder: resumeBuilderTokens,
  shadows,
  sizing,
  spacing,
} as const;

export type CareerCopilotTokens = typeof tokens;
export type ColorTokenName = keyof typeof colorTokens;
export type SpacingTokenName = keyof typeof spacing;
