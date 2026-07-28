import { createTheme } from '@mui/material/styles';

import { borderRadius, colorTokens, fontFamily, fontWeight, palette } from '@/tokens';

const rootFontSize = 16;
const remToPx = (value: string) => Number.parseFloat(value) * rootFontSize;

export const appTheme = createTheme({
  palette: {
    background: {
      default: colorTokens.backgroundApp,
      paper: colorTokens.backgroundCard,
    },
    error: {
      main: colorTokens.feedbackError,
    },
    primary: {
      contrastText: colorTokens.textInverse,
      dark: colorTokens.actionPrimaryHover,
      light: palette.blue500,
      main: colorTokens.actionPrimary,
    },
    success: {
      main: colorTokens.feedbackSuccess,
    },
    text: {
      primary: colorTokens.textPrimary,
      secondary: colorTokens.textSecondary,
    },
  },
  shape: {
    borderRadius: remToPx(borderRadius.lg),
  },
  typography: {
    button: {
      fontWeight: fontWeight.bold,
      textTransform: 'none',
    },
    fontFamily: fontFamily.sans,
  },
});
