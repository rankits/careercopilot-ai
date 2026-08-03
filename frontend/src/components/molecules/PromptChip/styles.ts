import { Chip, styled } from '@/lib/material';
import { borderRadius, colorTokens, fontSize, fontWeight, spacing } from '@/tokens';

export const PromptChipButton = styled(Chip)({
  backgroundColor: colorTokens.backgroundCard,
  border: `0.0625rem solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.full,
  color: colorTokens.textPrimary,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  height: 'auto',
  justifyContent: 'flex-start',
  maxWidth: '100%',
  paddingBlock: spacing[1],
  transition: 'border-color 160ms ease, background-color 160ms ease, transform 160ms ease',

  '& .MuiChip-label': {
    display: 'block',
    paddingBlock: spacing[1],
    paddingInline: spacing[2],
    whiteSpace: 'normal',
  },

  '&:hover': {
    backgroundColor: colorTokens.actionPrimarySurface,
    borderColor: colorTokens.borderHover,
    transform: 'translateY(-1px)',
  },

  '&:focus-visible': {
    outline: `0.125rem solid ${colorTokens.borderFocus}`,
    outlineOffset: '0.125rem',
  },
});
