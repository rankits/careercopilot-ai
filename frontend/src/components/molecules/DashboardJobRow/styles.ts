import { MuiButton, styled } from '@/lib/material';
import { borderRadius, colorTokens, fontSize, fontWeight, jobFeedTokens, spacing } from '@/tokens';

export const DashboardJobRowRoot = styled('article', {
  shouldForwardProp: (prop) => prop !== 'featured',
})<{ featured: boolean }>(({ featured }) => ({
  alignItems: 'center',
  background: colorTokens.backgroundCard,
  border: `0.0625rem solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.lg,
  display: 'grid',
  columnGap: spacing[4],
  gridTemplateColumns: featured
    ? '3.5rem minmax(12rem, 1fr) auto'
    : '3.25rem minmax(12rem, 0.8fr) minmax(5.5rem, auto) minmax(4.5rem, auto) minmax(5.5rem, auto) minmax(12rem, 0.9fr) auto',
  padding: featured ? spacing[4] : `${spacing[2]} ${spacing[3]}`,

  '@media (max-width: 86rem)': {
    gridTemplateColumns: featured ? '3.5rem minmax(0, 1fr) auto' : '3.25rem minmax(0, 1fr) auto',

    '& > div:nth-of-type(3), & > div:nth-of-type(4)': {
      display: featured ? undefined : 'none',
    },

    '& > div:nth-of-type(5)': {
      gridColumn: featured ? undefined : '2 / 3',
    },
  },

  '@media (max-width: 48rem)': {
    alignItems: 'start',
    gridTemplateColumns: '3rem minmax(0, 1fr)',
    padding: spacing[3],

    '& > div:last-child': {
      gridColumn: '1 / -1',
      justifyContent: 'stretch',
      width: '100%',
    },

    '& > div:last-child button': {
      flex: 1,
    },
  },
}));

export const FeaturedJobRoot = styled('article')({
  alignItems: 'center',
  background: 'linear-gradient(135deg, rgba(244,247,255,0.96), rgba(255,255,255,0.88))',
  border: `0.0625rem solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.lg,
  boxShadow: 'inset 0 0.0625rem 0 rgba(255,255,255,0.9), 0 1rem 2.5rem rgba(33,83,166,0.06)',
  display: 'grid',
  gap: spacing[5],
  gridTemplateColumns: '4rem minmax(0, 1fr) auto',
  minHeight: '8rem',
  padding: spacing[5],
  width: '100%',

  '& > div:first-of-type': {
    fontSize: fontSize['2xl'],
    height: '3.75rem',
    width: '3.75rem',
  },

  '& > div:nth-of-type(2)': {
    alignSelf: 'center',
    gap: spacing[2],
  },

  '& > div:nth-of-type(2) h3': {
    fontSize: fontSize.base,
  },

  '& > div:last-child > span': {
    justifySelf: 'end',
  },

  '@media (max-width: 78rem)': {
    alignItems: 'start',
    gridTemplateColumns: '3rem minmax(0, 1fr)',

    '& > div:last-child': {
      gridColumn: '1 / -1',
    },
  },
});

export const FeaturedSide = styled('div')({
  alignContent: 'center',
  display: 'grid',
  gap: spacing[3],
  justifyItems: 'end',
  minWidth: '13rem',

  '@media (max-width: 78rem)': {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    minWidth: 0,
    width: '100%',
  },

  '@media (max-width: 36rem)': {
    alignItems: 'stretch',
    display: 'grid',
    justifyItems: 'stretch',
  },
});

export const CompanyLogoBox = styled('div')({
  alignItems: 'center',
  background: jobFeedTokens.companyLogoSurface,
  border: `0.0625rem solid ${colorTokens.borderSubtle}`,
  borderRadius: borderRadius.lg,
  display: 'grid',
  fontSize: fontSize.xl,
  fontWeight: fontWeight.bold,
  height: '3rem',
  justifyItems: 'center',
  width: '3rem',
});

export const JobCopy = styled('div')({
  display: 'grid',
  gap: spacing[1],
  minWidth: 0,

  '& p': {
    color: colorTokens.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    margin: 0,
  },
});

export const TitleLine = styled('div')({
  alignItems: 'center',
  display: 'flex',
  gap: spacing[1],

  '& h3': {
    color: colorTokens.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    lineHeight: 1.2,
    margin: 0,
  },
});

export const VerifiedIcon = styled('svg')({
  color: jobFeedTokens.verifiedIcon,
  flexShrink: 0,
  height: spacing[4],
  width: spacing[4],
});

export const MetaLine = styled('div')({
  color: colorTokens.textSecondary,
  display: 'flex',
  flexWrap: 'wrap',
  fontSize: fontSize.xs,
  gap: spacing[3],

  '& span': {
    alignItems: 'center',
    display: 'inline-flex',
    gap: spacing[1],
  },
});

export const SalaryText = styled('div')({
  justifySelf: 'start',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  fontWeight: fontWeight.bold,
  color: colorTokens.textPrimary,
  fontSize: fontSize.sm,
});

export const PostedText = styled('div')({
  justifySelf: 'center',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  color: colorTokens.textSecondary,
  fontSize: fontSize.xs,
  lineHeight: 1.35,
});

export const MatchBadge = styled('span')({
  background: jobFeedTokens.matchBackground,
  borderRadius: borderRadius.full,
  color: jobFeedTokens.matchText,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.bold,
  justifySelf: 'start',
  padding: `${spacing[1]} ${spacing[3]}`,
  whiteSpace: 'nowrap',
});

export const SkillList = styled('div')({
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing[2],

  '@media (max-width: 86rem)': {
    gridColumn: '2 / -1',
  },

  '@media (max-width: 48rem)': {
    gridColumn: '1 / -1',
  },
});

export const SkillChip = styled('span')({
  background: jobFeedTokens.skillBackground,
  borderRadius: borderRadius.md,
  color: jobFeedTokens.skillText,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
  padding: `${spacing[1]} ${spacing[2]}`,
});

export const ActionGroup = styled('div')({
  display: 'flex',
  gap: spacing[2],
  justifyContent: 'end',
  whiteSpace: 'nowrap',

  '@media (max-width: 36rem)': {
    width: '100%',
  },
});

export const SaveAction = styled(MuiButton)({
  border: `0.0625rem solid ${colorTokens.actionPrimaryActive}`,
  borderRadius: borderRadius.lg,
  color: colorTokens.actionPrimaryActive,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.bold,
  minHeight: spacing[8],
  minWidth: '5.25rem',
  textTransform: 'none',
});
