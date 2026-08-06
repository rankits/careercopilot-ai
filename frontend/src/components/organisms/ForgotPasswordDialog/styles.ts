import type { SxProps, Theme } from '@/lib/material';
import { borderRadius, colorTokens, fontSize, fontWeight, shadows, spacing } from '@/tokens';

export const forgotPasswordDialogSx = {
  root: {
    '& .MuiDialog-container': {
      alignItems: 'center',
      display: 'flex',
      height: '100dvh',
      justifyContent: 'center',
      margin: 0,
      padding: {
        xs: spacing[2],
        sm: spacing[3],
      },
      width: '100vw',
    },
  } satisfies SxProps<Theme>,
  backdrop: {
    backdropFilter: 'blur(10px)',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  } satisfies SxProps<Theme>,
  paper: {
    backgroundColor: colorTokens.backgroundCard,
    border: `1px solid ${colorTokens.borderDefault}`,
    borderRadius: { xs: '16px', sm: '24px' },
    boxShadow: shadows.card,
    display: 'flex',
    flexDirection: 'column',
    margin: 0,
    maxHeight: {
      xs: 'calc(100dvh - 1rem)',
      sm: 'calc(100dvh - 48px)',
    },
    maxWidth: {
      xs: '100%',
      sm: '560px',
      md: '640px',
    },
    overflow: 'hidden',
    position: 'relative',
    width: {
      xs: '100%',
      sm: '92%',
      md: '640px',
    },
  } satisfies SxProps<Theme>,
  dialogContent: {
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    minHeight: 0,
    overflowX: 'hidden',
    overflowY: 'auto',
    p: {
      xs: `${spacing[3]} ${spacing[3]} 0`,
      sm: `${spacing[4]} ${spacing[4]} 0`,
      md: `${spacing[5]} ${spacing[5]} 0`,
    },
    WebkitOverflowScrolling: 'touch',
  } satisfies SxProps<Theme>,
  closeButton: {
    borderRadius: borderRadius.full,
    color: colorTokens.textSecondary,
    p: spacing[1],
    position: 'absolute',
    right: spacing[1],
    top: spacing[1],
    zIndex: 2,
    '&:hover': {
      backgroundColor: colorTokens.backgroundApp,
      color: colorTokens.textPrimary,
    },
  } satisfies SxProps<Theme>,
  stepper: {
    alignItems: 'flex-start',
    borderBottom: `1px solid ${colorTokens.borderSubtle}`,
    display: 'flex',
    justifyContent: 'space-between',
    mb: {
      xs: spacing[3],
      sm: spacing[4],
    },
    minWidth: 0,
    pb: {
      xs: spacing[2],
      sm: spacing[3],
    },
    pt: spacing[1],
    px: {
      xs: 0,
      sm: spacing[2],
    },
  } satisfies SxProps<Theme>,
  stepItem: {
    alignItems: 'center',
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    minWidth: 0,
    position: 'relative',
  } satisfies SxProps<Theme>,
  stepCircle: (active: boolean) =>
    ({
      alignItems: 'center',
      backgroundColor: active ? colorTokens.actionPrimary : colorTokens.backgroundApp,
      border: `2px solid ${active ? colorTokens.actionPrimary : colorTokens.borderDefault}`,
      borderRadius: borderRadius.full,
      boxShadow: active ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none',
      color: active ? '#FFFFFF' : colorTokens.textSecondary,
      display: 'flex',
      flexShrink: 0,
      fontSize: { xs: fontSize.xs, sm: fontSize.sm },
      fontWeight: fontWeight.bold,
      height: { xs: '1.75rem', sm: '2.5rem' },
      justifyContent: 'center',
      position: 'relative',
      transition: 'all 0.2s ease-in-out',
      width: { xs: '1.75rem', sm: '2.5rem' },
      zIndex: 1,
      '& .MuiSvgIcon-root': {
        fontSize: { xs: '0.875rem', sm: '1.125rem' },
      },
    }) satisfies SxProps<Theme>,
  stepLabel: (active: boolean) =>
    ({
      color: active ? colorTokens.actionPrimary : colorTokens.textSecondary,
      fontSize: { xs: '0.65rem', sm: fontSize.xs },
      fontWeight: active ? fontWeight.bold : fontWeight.medium,
      lineHeight: 1.25,
      maxWidth: '100%',
      mt: spacing[1],
      overflowWrap: 'anywhere',
      px: '0.125rem',
      textAlign: 'center',
      transition: 'color 0.2s ease-in-out',
      whiteSpace: { xs: 'normal', sm: 'nowrap' },
    }) satisfies SxProps<Theme>,
  stepLabelFull: {
    display: { xs: 'none', sm: 'inline' },
  } satisfies SxProps<Theme>,
  stepLabelShort: {
    display: { xs: 'inline', sm: 'none' },
  } satisfies SxProps<Theme>,
  stepLine: {
    borderTop: `2px dashed ${colorTokens.borderDefault}`,
    left: '50%',
    position: 'absolute',
    top: { xs: '0.875rem', sm: '1.25rem' },
    transform: 'translateY(-50%)',
    width: '100%',
    zIndex: 0,
  } satisfies SxProps<Theme>,
  mainContent: {
    alignItems: {
      xs: 'stretch',
      sm: 'center',
    },
    display: 'grid',
    flex: '1 1 auto',
    gap: {
      xs: spacing[2],
      sm: spacing[3],
      md: spacing[4],
    },
    gridTemplateColumns: {
      xs: '1fr',
      // Side-by-side from tablet up so the penguin stays visible without eating vertical space.
      sm: 'minmax(120px, 0.9fr) minmax(0, 1.1fr)',
      md: '0.85fr 1.15fr',
    },
    minHeight: 0,
    minWidth: 0,
    px: { xs: 0, sm: spacing[1] },
    py: { xs: 0, sm: spacing[1] },
    width: '100%',
  } satisfies SxProps<Theme>,
  heroImageWrapper: {
    alignItems: 'center',
    background: 'none',
    border: 'none',
    borderRadius: 0,
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
    p: 0,
    width: '100%',
  } satisfies SxProps<Theme>,
  heroImage: {
    display: 'block',
    filter: 'drop-shadow(0 8px 16px rgba(37, 99, 235, 0.12))',
    // Always visible: scale with both width and height so short phones still fit.
    height: 'auto',
    margin: '0 auto',
    maxHeight: 'clamp(64px, 18vh, 190px)',
    maxWidth: '100%',
    objectFit: 'contain',
    width: {
      xs: 'clamp(64px, 22vw, 110px)',
      sm: 'clamp(110px, 20vw, 160px)',
      md: 'clamp(140px, 18vw, 200px)',
    },
  } satisfies SxProps<Theme>,
  formContent: {
    display: 'grid',
    gap: {
      xs: spacing[1],
      sm: spacing[2],
    },
    minWidth: 0,
    textAlign: 'left',
    width: '100%',
  } satisfies SxProps<Theme>,
  title: {
    color: colorTokens.textPrimary,
    fontSize: { xs: fontSize.lg, sm: fontSize.xl, md: fontSize['2xl'] },
    fontWeight: fontWeight.extraBold,
    lineHeight: 1.2,
    m: 0,
    textAlign: {
      xs: 'center',
      sm: 'left',
    },
  } satisfies SxProps<Theme>,
  subtitle: {
    color: colorTokens.textSecondary,
    fontSize: { xs: fontSize.xs, sm: fontSize.sm },
    lineHeight: 1.5,
    mb: spacing[1],
    overflowWrap: 'anywhere',
    textAlign: {
      xs: 'center',
      sm: 'left',
    },
    wordBreak: 'break-word',
    '& strong': {
      color: colorTokens.textPrimary,
      fontWeight: fontWeight.bold,
    },
  } satisfies SxProps<Theme>,
  form: {
    display: 'grid',
    gap: {
      xs: spacing[2],
      sm: spacing[3],
    },
    textAlign: 'left',
    width: '100%',
  } satisfies SxProps<Theme>,
  passwordFields: {
    display: 'grid',
    gap: {
      xs: spacing[3],
      sm: spacing[3],
    },
    width: '100%',
  } satisfies SxProps<Theme>,
  passwordFieldGroup: {
    display: 'grid',
    gap: spacing[1],
    width: '100%',
  } satisfies SxProps<Theme>,
  otpGrid: {
    display: 'grid',
    gap: {
      xs: spacing[1],
      sm: spacing[2],
    },
    gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
    maxWidth: '100%',
    my: spacing[1],
    width: '100%',
  } satisfies SxProps<Theme>,
  otpInput: (hasError = false) =>
    ({
      minWidth: 0,
      width: '100%',
      '& .MuiFormLabel-root': {
        display: 'none',
      },
      '& .MuiOutlinedInput-root': {
        borderRadius: borderRadius.md,
        minHeight: { xs: '2.5rem', sm: '3rem' },
        px: { xs: '0.125rem', sm: spacing[1] },
        ...(hasError
          ? {
              bgcolor: colorTokens.feedbackErrorSurface,
              borderColor: colorTokens.feedbackError,
            }
          : {}),
      },
      '& .MuiInputBase-input': {
        fontSize: { xs: fontSize.base, sm: fontSize.lg },
        fontWeight: fontWeight.bold,
        p: {
          xs: `${spacing[1]} 0`,
          sm: spacing[2],
        },
        textAlign: 'center',
      },
      '& .MuiOutlinedInput-notchedOutline legend': {
        display: 'none',
      },
    }) satisfies SxProps<Theme>,
  otpError: {
    color: colorTokens.feedbackError,
    fontSize: fontSize.xs,
    mt: 0,
    textAlign: 'center',
  } satisfies SxProps<Theme>,
  resendRow: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing[1],
    justifyContent: 'center',
    mt: 0,
    rowGap: '0.125rem',
    textAlign: 'center',
  } satisfies SxProps<Theme>,
  resendText: {
    color: colorTokens.textSecondary,
    fontSize: fontSize.xs,
  } satisfies SxProps<Theme>,
  resendLink: {
    appearance: 'none',
    background: 'none',
    border: 'none',
    color: colorTokens.actionPrimary,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    p: 0,
    '&:disabled': {
      cursor: 'not-allowed',
      opacity: 0.6,
    },
    '&:hover:not(:disabled)': {
      textDecoration: 'underline',
    },
  } satisfies SxProps<Theme>,
  strengthRow: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing[2],
    minHeight: '1.25rem',
  } satisfies SxProps<Theme>,
  strengthBar: (strength: string) =>
    ({
      backgroundColor:
        strength === 'Strong'
          ? colorTokens.feedbackSuccess
          : strength === 'Medium'
            ? colorTokens.actionPrimary
            : strength === 'Weak'
              ? colorTokens.feedbackError
              : colorTokens.borderDefault,
      borderRadius: borderRadius.full,
      height: '0.375rem',
      transition: 'width 0.3s ease-in-out, background-color 0.3s ease-in-out',
      width:
        strength === 'Strong'
          ? '100%'
          : strength === 'Medium'
            ? '60%'
            : strength === 'Weak'
              ? '25%'
              : '25%',
    }) satisfies SxProps<Theme>,
  actionRow: {
    alignItems: 'center',
    backgroundColor: colorTokens.backgroundCard,
    borderTop: `1px solid ${colorTokens.borderSubtle}`,
    bottom: 0,
    display: 'flex',
    flexDirection: {
      xs: 'column-reverse',
      sm: 'row',
    },
    flexShrink: 0,
    gap: spacing[2],
    justifyContent: 'space-between',
    mt: 'auto',
    position: 'sticky',
    pt: {
      xs: spacing[3],
      sm: spacing[4],
    },
    pb: {
      xs: `max(${spacing[3]}, env(safe-area-inset-bottom))`,
      sm: spacing[5],
    },
    px: 0,
    zIndex: 1,
  } satisfies SxProps<Theme>,
  backButton: {
    flexShrink: 0,
    width: {
      xs: '100%',
      sm: 'auto',
    },
  } satisfies SxProps<Theme>,
  primaryButton: {
    minWidth: {
      sm: '180px',
    },
    width: {
      xs: '100%',
      sm: 'auto',
    },
  } satisfies SxProps<Theme>,
} as const;
