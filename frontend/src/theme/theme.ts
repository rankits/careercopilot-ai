import { createTheme } from '@/lib/material';
import { borderRadius, colorTokens, fontFamily, fontWeight, palette } from '@/tokens';

const rootFontSize = 16;
const remToPx = (value: string) => Number.parseFloat(value) * rootFontSize;

export const appTheme = createTheme({
  components: {
    MuiMenu: {
      defaultProps: {
        anchorOrigin: {
          horizontal: 'right',
          vertical: 'bottom',
        },
        slotProps: {
          paper: {
            sx: {
              mt: 0.75,
            },
          },
        },
        transformOrigin: {
          horizontal: 'right',
          vertical: 'top',
        },
      },
    },
  },
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
