import { IconButton, styled } from '@/lib/material';
import {
  borderRadius,
  colorTokens,
  fontSize,
  fontWeight,
  jobFeedTokens,
  shadows,
  spacing,
} from '@/tokens';

export const CardRoot = styled('article')({
  background: colorTokens.backgroundCard,
  border: `0.0625rem solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.xl,
  boxShadow: shadows.card,
  cursor: 'pointer',
  display: 'grid',
  gap: spacing[4],
  gridTemplateColumns: '0.125rem minmax(0, 1fr) auto',
  padding: `${spacing[4]} ${spacing[4]} ${spacing[4]} 0`,
  transition: 'border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',

  '&:hover': {
    borderColor: colorTokens.actionPrimary,
    boxShadow: shadows.focus,
    transform: 'translateY(-0.0625rem)',
  },

  '&:focus-visible': {
    outline: `0.1875rem solid ${colorTokens.actionPrimary}`,
    outlineOffset: '0.125rem',
  },

  '@media (max-width: 56rem)': {
    gridTemplateColumns: '0.125rem minmax(0, 1fr)',
  },
});

export const AccentBar = styled('span', {
  shouldForwardProp: (prop) => prop !== 'tone',
})<{ tone: 'primary' | 'danger' }>(({ tone }) => ({
  alignSelf: 'stretch',
  background: tone === 'danger' ? colorTokens.actionDanger : jobFeedTokens.jobCardAccent,
  borderRadius: `${borderRadius.xl} 0 0 ${borderRadius.xl}`,
  width: '0.125rem',
}));

export const LeftColumn = styled('div')({
  display: 'grid',
  gap: spacing[3],
  minWidth: 0,
});

export const CompanyRow = styled('div')({
  alignItems: 'flex-start',
  display: 'flex',
  gap: spacing[3],
  minWidth: 0,
});

export const Logo = styled('div')({
  alignItems: 'center',
  background: jobFeedTokens.companyLogoSurface,
  border: `0.0625rem solid ${colorTokens.borderSubtle}`,
  borderRadius: borderRadius.lg,
  color: colorTokens.textPrimary,
  display: 'grid',
  flexShrink: 0,
  fontSize: fontSize.xl,
  fontWeight: fontWeight.extraBold,
  height: spacing[12],
  justifyItems: 'center',
  overflow: 'hidden',
  width: spacing[12],

  '& img': {
    display: 'block',
    height: '100%',
    objectFit: 'contain',
    padding: spacing[1],
    width: '100%',
  },
});

export const TitleBlock = styled('div')({
  display: 'grid',
  gap: spacing[1],
  minWidth: 0,

  '& > p': {
    alignItems: 'center',
    color: colorTokens.textSecondary,
    display: 'inline-flex',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semiBold,
    gap: spacing[1],
    margin: 0,

    '& .MuiSvgIcon-root': {
      color: colorTokens.actionPrimary,
      fontSize: fontSize.base,
    },
  },

  '& > h2': {
    color: colorTokens.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extraBold,
    lineHeight: 1.25,
    margin: 0,
  },
});

export const MetaRow = styled('div')({
  color: colorTokens.textSecondary,
  display: 'flex',
  flexWrap: 'wrap',
  fontSize: fontSize.xs,
  gap: `${spacing[2]} ${spacing[4]}`,

  '& span': {
    alignItems: 'center',
    display: 'inline-flex',
    gap: spacing[1],
  },

  '& .MuiSvgIcon-root': {
    fontSize: fontSize.sm,
  },
});

export const SkillRow = styled('div')({
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing[2],
});

export const SkillChip = styled('span')({
  background: jobFeedTokens.skillBackground,
  borderRadius: borderRadius.md,
  color: jobFeedTokens.skillText,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.bold,
  padding: `${spacing[1]} ${spacing[2]}`,
});

export const RightColumn = styled('div')({
  alignContent: 'space-between',
  display: 'grid',
  gap: spacing[3],
  justifyItems: 'end',
  minWidth: '12rem',

  '@media (max-width: 56rem)': {
    gridColumn: '2 / -1',
    justifyItems: 'stretch',
    minWidth: 0,
  },
});

export const TopRight = styled('div')({
  alignItems: 'flex-end',
  display: 'grid',
  gap: spacing[2],
  justifyItems: 'end',

  '@media (max-width: 56rem)': {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    justifyItems: 'start',
  },
});

export const MatchBadge = styled('span')({
  alignItems: 'center',
  background: jobFeedTokens.matchBackground,
  borderRadius: borderRadius.full,
  color: jobFeedTokens.matchText,
  display: 'inline-flex',
  fontSize: fontSize.xs,
  fontWeight: fontWeight.bold,
  gap: spacing[1],
  lineHeight: 1,
  padding: `${spacing[1]} ${spacing[2]}`,

  '& .MuiSvgIcon-root': {
    fontSize: fontSize.sm,
  },
});

export const SavedMeta = styled('span')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
});

export const ActionsRow = styled('div')({
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing[2],
  justifyContent: 'flex-end',

  '@media (max-width: 56rem)': {
    justifyContent: 'flex-start',
  },
});

export const SaveIconButton = styled(IconButton)({
  background: colorTokens.actionPrimarySurface,
  border: `0.0625rem solid ${colorTokens.borderSubtle}`,
  borderRadius: borderRadius.lg,
  color: colorTokens.actionPrimary,
  height: spacing[9],
  width: spacing[9],

  '&:hover': {
    background: colorTokens.actionPrimarySubtle,
  },
});
