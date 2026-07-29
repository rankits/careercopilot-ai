import type { SxProps, Theme } from '@/lib/material';
import { colorTokens, fontSize, fontWeight, shadows, spacing } from '@/tokens';

export const forgotPasswordDialogSx = {
  backdrop: {
    backdropFilter: 'blur(0.75rem)',
    backgroundColor: colorTokens.dialogBackdrop,
  } satisfies SxProps<Theme>,
  dialogContent: {
    display: 'grid',
    gap: { xs: spacing[3], sm: spacing[4] },
    overflow: 'visible',
    px: { xs: spacing[3], sm: spacing[8] },
    py: { xs: spacing[4], sm: spacing[8] },
    textAlign: 'center',
  } satisfies SxProps<Theme>,
  closeButton: {
    alignSelf: 'end',
    color: colorTokens.textSecondary,
    justifySelf: 'end',
    mt: { xs: 0, sm: spacing[1] },
  } satisfies SxProps<Theme>,
  form: {
    display: 'grid',
    gap: { xs: spacing[3], sm: spacing[4] },
    textAlign: 'left',
  } satisfies SxProps<Theme>,
  heroImage: {
    display: 'block',
    margin: '0 auto',
    maxWidth: { xs: '18rem', sm: '34rem' },
    width: '100%',
  } satisfies SxProps<Theme>,
  paper: {
    backgroundColor: colorTokens.backgroundCard,
    border: `0.0625rem solid ${colorTokens.borderDefault}`,
    borderRadius: { xs: 0, sm: '2rem' },
    boxShadow: shadows.card,
    maxWidth: { xs: '100vw', sm: '50rem' },
    overflow: 'hidden',
    width: '100%',
  } satisfies SxProps<Theme>,
  subtitle: {
    color: colorTokens.textSecondary,
    fontSize: { xs: fontSize.sm, sm: fontSize.lg },
    lineHeight: 1.7,
    m: 0,
  } satisfies SxProps<Theme>,
  title: {
    color: colorTokens.textPrimary,
    fontSize: { xs: fontSize['2xl'], sm: fontSize['3xl'] },
    fontWeight: fontWeight.extraBold,
    lineHeight: 1.1,
    m: 0,
  } satisfies SxProps<Theme>,
  contentStack: {
    display: 'grid',
    gap: { xs: spacing[3], sm: spacing[4] },
    p: { xs: spacing[3], sm: spacing[6] },
  } satisfies SxProps<Theme>,
} as const;
