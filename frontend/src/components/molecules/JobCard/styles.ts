import { CheckCircleIcon, IconButton, styled } from '@/lib/material';
import {
  borderRadius,
  colorTokens,
  fontSize,
  fontWeight,
  jobFeedTokens,
  shadows,
  spacing,
} from '@/tokens';

export const JobCardRoot = styled('article')({
  alignItems: 'center',
  background: colorTokens.backgroundCard,
  border: `0.0625rem solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.xl,
  boxShadow: shadows.card,
  display: 'grid',
  gap: spacing[3],
  gridTemplateColumns: '0.125rem 4.5rem minmax(0, 1fr) auto',
  minHeight: '7.75rem',
  padding: `${spacing[3]} ${spacing[4]} ${spacing[3]} 0`,

  '@media (max-width: 64rem)': {
    gridTemplateColumns: '0.125rem 4.5rem minmax(0, 1fr)',
  },

  '@media (max-width: 48rem)': {
    alignItems: 'start',
    gridTemplateColumns: '0.125rem 3.75rem minmax(0, 1fr)',
    paddingRight: spacing[3],
  },
});

export const Accent = styled('span', {
  shouldForwardProp: (prop) => prop !== 'tone',
})<{ tone: 'primary' | 'danger' }>(({ tone }) => ({
  alignSelf: 'stretch',
  background: tone === 'danger' ? colorTokens.actionDanger : jobFeedTokens.jobCardAccent,
  width: '0.125rem',
}));

export const CompanyLogo = styled('div')({
  alignItems: 'center',
  background: jobFeedTokens.companyLogoSurface,
  border: `0.0625rem solid ${colorTokens.borderSubtle}`,
  borderRadius: borderRadius.lg,
  display: 'grid',
  fontSize: fontSize['2xl'],
  fontWeight: fontWeight.extraBold,
  height: spacing[12],
  justifyItems: 'center',
  overflow: 'hidden',
  width: spacing[12],

  '& img': {
    display: 'block',
    height: '100%',
    objectFit: 'cover',
    width: '100%',
  },
});

export const JobDetails = styled('div')({
  display: 'grid',
  gap: spacing[1],
  minWidth: 0,
});

export const RecommendationPill = styled('span')({
  alignItems: 'center',
  background: jobFeedTokens.badgeBackground,
  borderRadius: borderRadius.md,
  color: jobFeedTokens.badgeText,
  display: 'inline-flex',
  fontSize: fontSize.xs,
  fontWeight: fontWeight.bold,
  gap: spacing[1],
  justifySelf: 'start',
  lineHeight: 1,
  padding: `${spacing[1]} ${spacing[2]}`,
});

export const TitleRow = styled('div')({
  alignItems: 'flex-start',
  display: 'flex',
  gap: spacing[2],

  '& h2': {
    color: colorTokens.textPrimary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.extraBold,
    lineHeight: 1.2,
    margin: 0,
  },

  '& p': {
    color: colorTokens.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    margin: `${spacing[1]} 0 0`,
  },
});

export const VerifiedIcon = styled(CheckCircleIcon)({
  color: jobFeedTokens.verifiedIcon,
  flexShrink: 0,
  marginTop: '0.0625rem',
});

export const JobMeta = styled('div')({
  color: colorTokens.textSecondary,
  display: 'flex',
  flexWrap: 'wrap',
  fontSize: fontSize.xs,
  gap: spacing[4],

  '& span': {
    alignItems: 'center',
    display: 'inline-flex',
    gap: spacing[1],
  },
});

export const SkillList = styled('div')({
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing[2],
});

export const SkillPill = styled('span')({
  background: jobFeedTokens.skillBackground,
  borderRadius: borderRadius.md,
  color: jobFeedTokens.skillText,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.bold,
  padding: `${spacing[1]} ${spacing[2]}`,
});

export const JobActions = styled('div')({
  alignItems: 'center',
  display: 'grid',
  gap: spacing[3],
  gridTemplateColumns: 'auto auto',
  justifyItems: 'end',
  minWidth: '13rem',

  '@media (max-width: 64rem)': {
    gridColumn: '2 / -1',
    gridTemplateColumns: '1fr auto auto',
    justifyItems: 'stretch',
    minWidth: 0,
    width: '100%',
  },

  '@media (max-width: 36rem)': {
    gridTemplateColumns: '1fr auto',
  },

  '& > button:last-child': {
    minWidth: '7.5rem',

    '@media (max-width: 36rem)': {
      gridColumn: '1 / -1',
      width: '100%',
    },
  },
});

export const MatchPill = styled('span')({
  alignItems: 'center',
  background: jobFeedTokens.matchBackground,
  borderRadius: borderRadius.full,
  color: jobFeedTokens.matchText,
  display: 'inline-flex',
  fontSize: fontSize.xs,
  fontWeight: fontWeight.extraBold,
  gap: spacing[2],
  gridColumn: '1 / -1',
  justifySelf: 'end',
  padding: `${spacing[2]} ${spacing[3]}`,
  whiteSpace: 'nowrap',

  '@media (max-width: 64rem)': {
    gridColumn: '1 / 2',
    justifySelf: 'start',
  },
});

export const MatchRing = styled('span')({
  border: `0.125rem solid ${jobFeedTokens.matchText}`,
  borderLeftColor: 'transparent',
  borderRadius: borderRadius.full,
  height: spacing[4],
  width: spacing[4],
});

export const SaveButton = styled(IconButton)({
  border: `0.0625rem solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.lg,
  color: colorTokens.textSecondary,
});
