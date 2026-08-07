import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import { styled } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';

import {
  borderRadius,
  colorTokens,
  fontSize,
  fontWeight,
  jobFeedTokens,
  shadows,
  spacing,
} from '@/tokens';

/** Matches AppLayout compact breakpoint (760px). */
const compactBreakpoint = '@media (max-width: 47.5rem)';

export const JobCardRoot = styled('article', {
  shouldForwardProp: (prop) => prop !== 'premiumHover',
})<{ premiumHover?: boolean }>(({ premiumHover }) => ({
  background: colorTokens.backgroundCard,
  border: `0.0625rem solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.xl,
  boxShadow: shadows.card,
  display: 'grid',
  gap: 0,
  gridTemplateColumns: '0.125rem minmax(0, 1fr)',
  minWidth: 0,
  overflow: 'hidden',
  transition: 'border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',

  ...(premiumHover
    ? {
        '&:hover': {
          borderColor: colorTokens.actionPrimary,
          boxShadow: shadows.focus,
          transform: 'translateY(-0.0625rem)',
        },
      }
    : null),
}));

export const Accent = styled('span', {
  shouldForwardProp: (prop) => prop !== 'tone',
})<{ tone: 'primary' | 'danger' }>(({ tone }) => ({
  alignSelf: 'stretch',
  background: tone === 'danger' ? colorTokens.actionDanger : jobFeedTokens.jobCardAccent,
  width: '0.125rem',
}));

export const CardBody = styled('div')({
  display: 'grid',
  gap: spacing[3],
  gridTemplateAreas: `
    "header header"
    "main actions"
    "meta meta"
    "skills skills"
  `,
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  minWidth: 0,
  padding: spacing[4],

  [compactBreakpoint]: {
    gap: spacing[3],
    gridTemplateAreas: `
      "header"
      "main"
      "meta"
      "skills"
      "actions"
    `,
    gridTemplateColumns: 'minmax(0, 1fr)',
    padding: spacing[3],
  },
});

export const HeaderRow = styled('div')({
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing[2],
  gridArea: 'header',
  justifyContent: 'space-between',
  minWidth: 0,
});

export const HeaderEnd = styled('div')({
  alignItems: 'center',
  display: 'inline-flex',
  flexShrink: 0,
  gap: spacing[2],
  marginLeft: 'auto',
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
  lineHeight: 1,
  padding: `${spacing[1]} ${spacing[2]}`,
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
  padding: `${spacing[2]} ${spacing[3]}`,
  whiteSpace: 'nowrap',
});

export const MatchRing = styled('span')({
  border: `0.125rem solid ${jobFeedTokens.matchText}`,
  borderLeftColor: 'transparent',
  borderRadius: borderRadius.full,
  height: spacing[4],
  width: spacing[4],
});

export const MainRow = styled('div')({
  alignItems: 'center',
  display: 'grid',
  gap: spacing[3],
  gridArea: 'main',
  gridTemplateColumns: '4.5rem minmax(0, 1fr)',
  minWidth: 0,

  [compactBreakpoint]: {
    alignItems: 'start',
    gridTemplateColumns: '3.75rem minmax(0, 1fr)',
  },
});

export const CompanyLogo = styled('div')({
  alignItems: 'center',
  background: jobFeedTokens.companyLogoSurface,
  border: `0.0625rem solid ${colorTokens.borderSubtle}`,
  borderRadius: borderRadius.lg,
  color: colorTokens.textPrimary,
  display: 'grid',
  fontSize: fontSize['2xl'],
  fontWeight: fontWeight.extraBold,
  height: spacing[12],
  justifyItems: 'center',
  width: spacing[12],

  [compactBreakpoint]: {
    height: '3.75rem',
    width: '3.75rem',
  },
});

export const JobDetails = styled('div')({
  display: 'grid',
  gap: spacing[1],
  minWidth: 0,
});

export const TitleRow = styled('div')({
  alignItems: 'flex-start',
  display: 'flex',
  gap: spacing[2],

  '& h2': {
    color: colorTokens.textPrimary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.extraBold,
    lineHeight: 1.25,
    margin: 0,
    overflowWrap: 'anywhere',
  },

  '& p': {
    color: colorTokens.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    margin: `${spacing[1]} 0 0`,
  },
});

export const OpenJobButton = styled('button')({
  background: 'transparent',
  border: 0,
  color: 'inherit',
  cursor: 'pointer',
  font: 'inherit',
  fontWeight: 'inherit',
  margin: 0,
  padding: 0,
  textAlign: 'left',

  '&:focus-visible': {
    borderRadius: borderRadius.sm,
    outline: `0.1875rem solid ${colorTokens.actionPrimary}`,
    outlineOffset: '0.1875rem',
  },
});

export const VerifiedIcon = styled(CheckCircleIcon)({
  color: jobFeedTokens.verifiedIcon,
  flexShrink: 0,
  marginTop: '0.0625rem',
});

export const JobActions = styled('div')({
  alignItems: 'center',
  alignSelf: 'center',
  borderLeft: `0.0625rem solid ${colorTokens.borderSubtle}`,
  display: 'flex',
  flexShrink: 0,
  gap: spacing[2],
  gridArea: 'actions',
  paddingLeft: spacing[3],

  [compactBreakpoint]: {
    borderLeft: 0,
    display: 'flex',
    flexDirection: 'column',
    flexWrap: 'nowrap',
    gap: spacing[2],
    justifyContent: 'stretch',
    paddingLeft: 0,
    width: '100%',

    '& > button[data-action="save"], & > button[data-action="apply"]': {
      width: '100%',
    },
  },
});

export const JobMeta = styled('div')({
  borderTop: `0.0625rem solid ${colorTokens.borderSubtle}`,
  color: colorTokens.textSecondary,
  display: 'flex',
  flexWrap: 'wrap',
  fontSize: fontSize.xs,
  gap: spacing[2],
  gridArea: 'meta',
  paddingTop: spacing[3],

  '& span': {
    alignItems: 'center',
    display: 'inline-flex',
    gap: spacing[1],

    '&:not(:last-child)::after': {
      background: colorTokens.borderDefault,
      content: '""',
      display: 'inline-block',
      height: '0.75rem',
      marginLeft: spacing[2],
      width: '0.0625rem',
    },
  },

  '& .MuiSvgIcon-root': {
    fontSize: fontSize.sm,
  },
});

export const SkillList = styled('div')({
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing[2],
  gridArea: 'skills',
});

export const SkillPill = styled('span')({
  background: jobFeedTokens.skillBackground,
  borderRadius: borderRadius.md,
  color: jobFeedTokens.skillText,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.bold,
  padding: `${spacing[1]} ${spacing[2]}`,
});

/** Save control — icon-only on desktop, labeled full-width button on compact. */
export const saveActionButtonSx: SxProps<Theme> = {
  background: colorTokens.actionPrimarySurface,
  borderColor: colorTokens.borderSubtle,
  color: colorTokens.actionPrimary,
  minWidth: spacing[9],

  '&:hover': {
    background: colorTokens.actionPrimarySubtle,
    borderColor: colorTokens.borderSubtle,
  },

  [compactBreakpoint]: {
    width: '100%',
  },

  '@media (min-width: 47.501rem)': {
    minWidth: spacing[9],
    padding: spacing[2],
    width: spacing[9],

    '& .MuiButton-startIcon': {
      margin: 0,
    },

    '& .save-action-label': {
      display: 'none',
    },
  },
};

export const OverflowButton = styled(IconButton)({
  border: `0.0625rem solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.lg,
  color: colorTokens.textSecondary,
});

export const MoreActionsButton = styled(IconButton)({
  border: `0.0625rem solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.lg,
  color: colorTokens.textSecondary,
  height: spacing[9],
  width: spacing[9],
});

export const JobActionsMenu = styled(Menu)({
  '& .MuiPaper-root': {
    border: `0.0625rem solid ${colorTokens.borderDefault}`,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.card,
    minWidth: '11rem',
  },

  '& .MuiMenuItem-root': {
    color: colorTokens.textPrimary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    gap: spacing[2],
    minHeight: spacing[8],
  },

  '& .MuiMenuItem-root[data-action="details"]': {
    borderTop: `0.0625rem solid ${colorTokens.borderSubtle}`,
    marginTop: spacing[1],
  },
});
