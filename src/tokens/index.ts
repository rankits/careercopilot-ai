export const palette = {
  blue50: '#eff6ff',
  blue100: '#dbeafe',
  blue500: '#3b82f6',
  blue600: '#2563eb',
  blue700: '#1d4ed8',
  blue800: '#1e40af',
  green50: '#f0fdf4',
  green600: '#16a34a',
  red50: '#fef2f2',
  red600: '#dc2626',
  red700: '#b91c1c',
  gray0: '#ffffff',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
} as const;

export const colorTokens = {
  actionPrimary: palette.blue600,
  actionPrimaryHover: palette.blue700,
  actionPrimarySurface: palette.blue50,
  actionDanger: palette.red600,
  actionDangerHover: palette.red700,
  backgroundApp: '#f5f8ff',
  backgroundCard: palette.gray0,
  borderDefault: '#dfe7f6',
  borderFocus: palette.blue600,
  borderSubtle: palette.gray200,
  feedbackError: palette.red600,
  feedbackErrorSurface: palette.red50,
  feedbackSuccess: palette.green600,
  textPrimary: '#14213d',
  textSecondary: '#64748b',
  textInverse: palette.gray0,
} as const;

export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  14: '56px',
  16: '64px',
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
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
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
