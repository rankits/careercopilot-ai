import type { SxProps, Theme } from '@/lib/material';
import { colorTokens, fontSize, fontWeight, shadows, spacing } from '@/tokens';

export const forgotPasswordDialogSx = {
  '*': {
    boxSizing: 'border-box',
  },
  root: {
    '& .MuiDialog-root': {
      overflow: 'hidden',
    },
    '& .MuiDialog-container': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100dvh',
      width: '100vw',
      margin: 0,
    },
  } satisfies SxProps<Theme>,
  actionRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    display: 'flex',
    flexDirection: {
      xs: 'column-reverse',
      sm: 'row',
    },
    position: {
      xs: 'sticky',
      sm: 'static',
    },
    bottom: 0,
    backgroundColor: colorTokens.backgroundCard,
    pt: spacing[2],
    mt: spacing[1],
  } satisfies SxProps<Theme>,
  backdrop: {
    backdropFilter: 'blur(0.75rem)',
    backgroundColor: colorTokens.dialogBackdrop,
    flexShrink: 0,
    fontSize: fontSize.base,
    mt: spacing[2],
    px: spacing[3],
    width: {
      xs: '100%',
      sm: 'auto',
    },
  } satisfies SxProps<Theme>,
  backButton: {
    flexShrink: 0,
    fontSize: fontSize.base,
    justifySelf: 'start',
    mt: spacing[2],
    px: spacing[3],
    width: {
      xs: '100%',
      sm: 'auto',
    },
    whiteSpace: 'normal',
  } satisfies SxProps<Theme>,
  closeButton: {
    color: colorTokens.textSecondary,
    position: 'absolute',
    top: spacing[1],
    right: {
      xs: spacing[0],
      sm: spacing[1],
    },
    zIndex: 2,
  } satisfies SxProps<Theme>,
  dialogContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    overflowY: 'auto',
    p: {
      xs: spacing[2],
      sm: spacing[3],
    },
    WebkitOverflowScrolling: 'touch',
  } satisfies SxProps<Theme>,
  form: {
    display: 'grid',
    gap: { xs: spacing[1], sm: spacing[2] },
    textAlign: 'left',
  } satisfies SxProps<Theme>,
  formContent: {
    display: 'grid',
    gap: { xs: spacing[1], sm: spacing[2] },
    textAlign: 'left',
    minWidth: 0,
    width: '100%',
  } satisfies SxProps<Theme>,
  heroImage: {
    display: 'block',
    width: {
      xs: '150px',
      sm: '180px',
      md: '220px',
    },
    maxWidth: '100%',
    maxHeight: {
      xs: '140px',
      md: '200px',
    },
    objectFit: 'contain',
    margin: {
      xs: '0 auto',
      md: 0,
    },
  } satisfies SxProps<Theme>,
  mainContent: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: {
      xs: '1fr',
      md: '0.8fr 1.2fr',
    },
    alignContent: 'flex-start',
    alignItems: {
      xs: 'center',
      md: 'flex-start',
    },
    gap: {
      xs: spacing[2],
      md: spacing[2],
    },
    px: spacing[1],
    py: spacing[1],
    minWidth: 0,
    minHeight: 0,
    width: '100%',
  } satisfies SxProps<Theme>,
  otpInput: {
    width: '100%',
    '& .MuiInputBase-input': {
      textAlign: 'center',
      fontWeight: fontWeight.bold,
      fontSize: {
        xs: '18px',
        sm: '22px',
      },
    },
  } satisfies SxProps<Theme>,
  paper: {
    backgroundColor: colorTokens.backgroundCard,
    border: `1px solid ${colorTokens.borderDefault}`,
    borderRadius: { xs: '24px', sm: '24px' },
    boxShadow: shadows.card,
    width: {
      xs: '90%',
      sm: '90%',
      md: '640px',
    },
    maxWidth: '640px',
    height: {
      xs: 'auto',
      sm: 'auto',
    },
    maxHeight: {
      xs: '100dvh',
      sm: 'calc(100dvh - 24px)',
    },
    margin: {
      xs: 0,
      sm: 'auto',
    },
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  } satisfies SxProps<Theme>,
  primaryButton: {
    fontSize: {
      xs: '17px',
      sm: '18px',
      md: '18px',
    },
    px: spacing[2],
    mt: spacing[1],
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    width: {
      xs: '100%',
      sm: '220px',
    },
  } satisfies SxProps<Theme>,
  resendText: {
    color: colorTokens.textSecondary,
    mb: 0,
    fontSize: fontSize.sm,
    textAlign: 'center',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
  } satisfies SxProps<Theme>,
  resendRow: {
    display: 'flex',
    flexDirection: {
      xs: 'column',
      sm: 'row',
    },
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    mt: spacing[2],
  } satisfies SxProps<Theme>,
  resendLink: {
    color: colorTokens.actionPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    cursor: 'pointer',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
  } satisfies SxProps<Theme>,
  stepCircle: (active: boolean) =>
    ({
      alignItems: 'center',
      backgroundColor: active ? colorTokens.actionPrimary : colorTokens.backgroundCard,
      border: `0.125rem solid ${active ? colorTokens.actionPrimary : colorTokens.borderDefault}`,
      borderRadius: '50%',
      color: active ? colorTokens.backgroundCard : colorTokens.textSecondary,
      display: 'flex',
      flexShrink: 0,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      height: { xs: '2rem', sm: '2.5rem' },
      justifyContent: 'center',
      position: 'relative',
      width: { xs: '2rem', sm: '2.5rem' },
      zIndex: 1,
    }) satisfies SxProps<Theme>,
  stepItem: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    '&:not(:last-child)::after': {
      content: '""',
      position: 'absolute',
      borderTop: `2px dashed ${colorTokens.borderDefault}`,
      zIndex: 0,
    },
  } satisfies SxProps<Theme>,
  stepLabel: (active: boolean) =>
    ({
      color: active ? colorTokens.actionPrimary : colorTokens.textSecondary,
      fontSize: {
        xs: '15px',
        sm: fontSize.sm,
      },
      textAlign: 'center',
      whiteSpace: 'normal',
      wordBreak: 'break-word',
      mt: spacing[1],
    }) satisfies SxProps<Theme>,
  stepLine: {
    position: 'absolute',
    top: '1.25rem',
    left: '50%',
    marginLeft: '1.25rem',
    marginRight: '1.25rem',
    width: 'calc(100% - 2.5rem)',
    borderTop: `2px dashed ${colorTokens.borderDefault}`,
    transform: 'translateY(-50%)',
    zIndex: 0,
  } satisfies SxProps<Theme>,
  stepper: {
    minWidth: 0,
    display: 'flex',
    justifyContent: 'space-between',
    overflow: 'hidden',
    pb: spacing[2],
    px: {
      xs: spacing[1],
      sm: spacing[2],
    },
  } satisfies SxProps<Theme>,
  strengthBar: (strength: string) =>
    ({
      backgroundColor:
        strength === 'Strong' ? colorTokens.feedbackSuccess : colorTokens.borderDefault,
      borderRadius: '999px',
      height: '0.375rem',
      width: strength === 'Strong' ? '80%' : strength === 'Medium' ? '50%' : '15%',
    }) satisfies SxProps<Theme>,
  strengthRow: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing[2],
    mt: `-${spacing[2]}`,
  } satisfies SxProps<Theme>,
  subtitle: {
    color: colorTokens.textSecondary,
    lineHeight: 1.5,
    mb: spacing[2],
    fontSize: {
      xs: '18px',
      sm: '18px',
      md: '18px',
    },
    textAlign: {
      xs: 'center',
      md: 'left',
    },
  } satisfies SxProps<Theme>,
  title: {
    color: colorTokens.textPrimary,
    fontSize: { xs: fontSize['2xl'], sm: fontSize['3xl'] },
    fontWeight: fontWeight.extraBold,
    lineHeight: 1.1,
    m: 0,
    textAlign: {
      xs: 'center',
      md: 'left',
    },
  } satisfies SxProps<Theme>,
} as const;
