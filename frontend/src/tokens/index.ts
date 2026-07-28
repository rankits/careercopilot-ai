export const palette = {
  blue50: '#f4f7ff',
  blue100: '#ede9ff',
  blue500: '#886cff',
  blue600: '#635bff',
  blue700: '#4f46e5',
  blue800: '#3f2bc2',
  green50: '#f0fdf4',
  green100: '#dcfce7',
  green600: '#16a34a',
  green700: '#0f8f45',
  red50: '#fef2f2',
  red100: '#fee2e2',
  red500: '#ef4444',
  red600: '#ef4444',
  red700: '#b91c1c',
  orange500: '#f59e0b',
  gray0: '#ffffff',
  gray50: '#fbfafc',
  gray100: '#f3f4f6',
  gray200: '#e8eef0',
  gray300: '#d1d5db',
  gray400: '#9aa3b8',
  gray500: '#575569',
  gray600: '#4b5563',
  gray700: '#24304b',
  gray800: '#1c2440',
  gray900: '#0f172a',
} as const;

export const colorTokens = {
  actionPrimary: palette.blue600,
  actionPrimaryHover: palette.blue700,
  actionPrimaryActive: palette.blue800,
  actionPrimarySurface: palette.blue50,
  actionPrimarySubtle: palette.blue100,
  actionDanger: palette.red600,
  actionDangerHover: palette.red700,
  actionDangerSurface: palette.red50,
  actionGhostHover: palette.blue100,
  actionSuccess: palette.green600,
  actionSuccessHover: palette.green700,
  actionSuccessSurface: palette.green50,
  backgroundApp: '#f5f8ff',
  backgroundCard: palette.gray0,
  borderDefault: '#e2e8f0',
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
  textPrimary: '#14213d',
  textSecondary: '#64748b',
  textTertiary: palette.gray400,
  textInverse: palette.gray0,
} as const;

export const spacing = {
  0: '0rem',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
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

export const shadows = {
  card: '0 20px 70px rgba(33, 83, 166, 0.1)',
  focus: '0 0 0 3px rgba(43, 105, 220, 0.15)',
} as const;

export const tokens = {
  borderRadius,
  color: colorTokens,
  fontFamily,
  fontSize,
  fontWeight,
  palette,
  shadows,
  spacing,
} as const;

export type CareerCopilotTokens = typeof tokens;
export type ColorTokenName = keyof typeof colorTokens;
export type SpacingTokenName = keyof typeof spacing;
