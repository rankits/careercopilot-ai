import { createTheme } from '@mui/material/styles';

import { borderRadius, colorTokens, fontFamily, fontWeight, palette } from '@/tokens';

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
    borderRadius: Number.parseInt(borderRadius.lg, 10),
  },
  typography: {
    button: {
      fontWeight: fontWeight.bold,
      textTransform: 'none',
    },
    fontFamily: fontFamily.sans,
  },
});
