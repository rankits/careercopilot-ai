import { Box, IconButton, LocationOnOutlinedIcon, MuiButton, styled } from '@/lib/material';
import {
  borderRadius,
  colorTokens,
  fontSize,
  fontWeight,
  jobFeedTokens,
  shadows,
  spacing,
} from '@/tokens';

const compactBreakpoint = '@media (max-width: 47.5rem)';
const tabletBreakpoint = '@media (max-width: 75rem)';

export const ApplicationsRoot = styled('section')({
  display: 'grid',
  gap: spacing[5],
  minWidth: 0,
  width: '100%',

  [compactBreakpoint]: {
    gap: spacing[4],
  },
});

export const PageHeader = styled(Box)({
  alignItems: 'flex-start',
  display: 'flex',
  gap: spacing[4],
  justifyContent: 'space-between',

  [tabletBreakpoint]: {
    alignItems: 'stretch',
    flexDirection: 'column',
  },
});

export const PageHeaderContent = styled(Box)({
  alignItems: 'center',
  display: 'grid',
  gap: spacing[4],
  gridTemplateColumns: 'auto minmax(0, 1fr)',
  minWidth: 0,

  [compactBreakpoint]: {
    gap: spacing[3],
  },
});

export const PageHeaderIcon = styled(Box)({
  alignItems: 'center',
  background: colorTokens.actionPrimarySurface,
  borderRadius: borderRadius.xl,
  color: colorTokens.actionPrimary,
  display: 'grid',
  flexShrink: 0,
  height: spacing[12],
  justifyItems: 'center',
  width: spacing[12],
});

export const PageHeaderCopy = styled(Box)({
  display: 'grid',
  gap: spacing[1],
  minWidth: 0,
});

export const PageEyebrow = styled('p')({
  color: colorTokens.actionPrimary,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.extraBold,
  letterSpacing: '0.12em',
  lineHeight: 1.2,
  margin: 0,
  textTransform: 'uppercase',
});

export const PageTitle = styled('h1')({
  color: colorTokens.textPrimary,
  fontSize: fontSize['2xl'],
  fontWeight: fontWeight.extraBold,
  lineHeight: 1.2,
  margin: 0,

  [compactBreakpoint]: {
    fontSize: fontSize.xl,
  },
});

export const PageSubtitle = styled('p')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  lineHeight: 1.5,
  margin: 0,
});

export const PageHeaderActions = styled(Box)({
  alignItems: 'center',
  display: 'flex',
  flexShrink: 0,
  gap: spacing[3],

  [tabletBreakpoint]: {
    flexWrap: 'wrap',
    width: '100%',
  },

  [compactBreakpoint]: {
    flexDirection: 'column',

    '& .MuiButton-root': {
      justifyContent: 'center',
      width: '100%',
    },
  },
});

export const MetricsGrid = styled(Box)({
  display: 'grid',
  gap: spacing[4],
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',

  [tabletBreakpoint]: {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },

  [compactBreakpoint]: {
    gap: spacing[3],
    gridTemplateColumns: '1fr',
  },
});

export const FilterPanel = styled(Box)({
  display: 'grid',
  gap: spacing[3],
  maxWidth: '100%',
  minWidth: 0,
  width: '100%',
});

export const FilterActionsBar = styled(Box)({
  alignItems: 'stretch',
  display: 'grid',
  gap: spacing[2],
  gridTemplateColumns: 'minmax(0, 1.45fr) repeat(3, minmax(0, 1fr))',

  '& > .applications-search-field': {
    minWidth: 0,
    width: '100%',
  },

  [tabletBreakpoint]: {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',

    '& > .applications-search-field': {
      gridColumn: '1 / -1',
    },

    '& > .filter-dropdown-wrap:last-of-type': {
      gridColumn: '1 / -1',
    },
  },

  [compactBreakpoint]: {
    gap: spacing[3],
    gridTemplateColumns: 'minmax(0, 1fr)',

    '& > .applications-search-field': {
      gridColumn: 'auto',
    },

    '& > .filter-dropdown-wrap:last-of-type': {
      gridColumn: 'auto',
    },
  },
});

export const FilterDropdownWrap = styled(Box)({
  minWidth: 0,
  width: '100%',
});

export const StatusTab = styled('button', {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active: boolean }>(({ active }) => ({
  '&:focus-visible': {
    boxShadow: `${colorTokens.actionPrimarySubtle} 0 0 0 0.25rem`,
    outline: 0,
  },
  '&:hover': {
    background: active ? colorTokens.actionPrimarySurface : jobFeedTokens.filterBackground,
    borderColor: active ? colorTokens.actionPrimary : colorTokens.borderHover,
    boxShadow: shadows.card,
    color: active ? colorTokens.actionPrimary : colorTokens.textPrimary,
    transform: 'translateY(-0.0625rem)',
  },
  alignItems: 'center',
  background: active ? colorTokens.actionPrimarySurface : jobFeedTokens.filterBackground,
  border: `0.0625rem solid ${active ? colorTokens.actionPrimary : colorTokens.borderDefault}`,
  borderRadius: borderRadius.full,
  boxSizing: 'border-box',
  color: active ? colorTokens.actionPrimary : colorTokens.textSecondary,
  cursor: 'pointer',
  display: 'inline-flex',
  flexShrink: 0,
  fontSize: fontSize.sm,
  fontWeight: active ? fontWeight.bold : fontWeight.medium,
  gap: spacing[2],
  height: spacing[9],
  justifyContent: 'center',
  lineHeight: 1,
  paddingInline: spacing[3],
  transition:
    'color 160ms ease, background 160ms ease, border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease',

  [compactBreakpoint]: {
    fontSize: fontSize.xs,
    height: spacing[8],
    paddingInline: spacing[2],
  },
}));

export const StatusTabDot = styled('span', {
  shouldForwardProp: (prop) => prop !== 'color',
})<{ color: string }>(({ color }) => ({
  background: color,
  borderRadius: borderRadius.full,
  flexShrink: 0,
  height: '0.5rem',
  width: '0.5rem',
}));

export const StatusTabCount = styled('span', {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>(({ active }) => ({
  alignItems: 'center',
  background: active ? colorTokens.backgroundCard : jobFeedTokens.badgeBackground,
  borderRadius: borderRadius.full,
  color: active ? colorTokens.actionPrimary : colorTokens.textSecondary,
  display: 'inline-flex',
  flexShrink: 0,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.bold,
  height: '1.25rem',
  justifyContent: 'center',
  lineHeight: 1,
  minWidth: '1.375rem',
  paddingInline: spacing[2],
}));

export const TablePanel = styled(Box)({
  background: colorTokens.backgroundCard,
  border: `0.0625rem solid ${colorTokens.borderSubtle}`,
  borderRadius: borderRadius.xl,
  boxShadow: shadows.card,
  display: 'grid',
  minWidth: 0,
  overflow: 'hidden',
});

export const TableToolbar = styled(Box)({
  alignItems: 'center',
  borderBottom: `0.0625rem solid ${colorTokens.borderSubtle}`,
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing[3],
  justifyContent: 'space-between',
  padding: `${spacing[3]} ${spacing[4]}`,

  [compactBreakpoint]: {
    alignItems: 'stretch',
    flexDirection: 'column',
    padding: spacing[3],
  },
});

export const TableToolbarText = styled('p')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  lineHeight: 1.4,
  margin: 0,

  [compactBreakpoint]: {
    fontSize: fontSize.xs,
  },
});

export const ViewToggleGroup = styled(Box)({
  alignItems: 'center',
  alignSelf: 'flex-start',
  background: colorTokens.actionPrimarySurface,
  borderRadius: borderRadius.lg,
  display: 'inline-flex',
  flexShrink: 0,
  gap: spacing[1],
  padding: spacing[1],

  [compactBreakpoint]: {
    display: 'none',
  },
});

export const LocationPinIcon = styled(LocationOnOutlinedIcon)({
  fontSize: fontSize.xs,
});

export const ViewToggleButton = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active: boolean }>(({ active }) => ({
  '&:hover': {
    background: active ? colorTokens.backgroundCard : colorTokens.backgroundCardTranslucent,
  },
  background: active ? colorTokens.backgroundCard : 'transparent',
  borderRadius: borderRadius.md,
  boxShadow: active ? shadows.card : 'none',
  color: active ? colorTokens.actionPrimary : colorTokens.textSecondary,
  height: spacing[8],
  width: spacing[8],
}));

export const TableScroll = styled(Box)({
  overflowX: 'auto',
  width: '100%',
  WebkitOverflowScrolling: 'touch',
});

export const ApplicationsTable = styled('table')({
  borderCollapse: 'separate',
  borderSpacing: 0,
  minWidth: '68rem',
  width: '100%',
});

export const TableHeadCell = styled('th')({
  background: colorTokens.actionPrimarySurface,
  borderBottom: `0.0625rem solid ${colorTokens.borderDefault}`,
  color: colorTokens.textSecondary,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.bold,
  letterSpacing: '0.04em',
  padding: `${spacing[3]} ${spacing[4]}`,
  textAlign: 'left',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
});

export const TableRow = styled('tr')({
  '&:hover td': {
    background: colorTokens.actionPrimarySurface,
  },
  '&:not(:last-of-type) td': {
    borderBottom: `0.0625rem solid ${colorTokens.borderDefault}`,
  },
});

export const TableCell = styled('td')({
  background: colorTokens.backgroundCard,
  color: colorTokens.textPrimary,
  fontSize: fontSize.sm,
  padding: `${spacing[3]} ${spacing[4]}`,
  verticalAlign: 'middle',
  whiteSpace: 'nowrap',
});

export const TableStickyHeadCell = styled(TableHeadCell)({
  background: colorTokens.actionPrimarySurface,
  boxShadow: shadows.focus,
  position: 'sticky',
  right: 0,
  zIndex: 2,
});

export const TableStickyCell = styled(TableCell)({
  background: colorTokens.backgroundCard,
  boxShadow: shadows.focus,
  position: 'sticky',
  right: 0,
  zIndex: 1,
});

export const ApplicationCell = styled(Box)({
  alignItems: 'center',
  display: 'flex',
  gap: spacing[3],
  minWidth: '14rem',
});

export const CompanyAvatar = styled('span', {
  shouldForwardProp: (prop) => prop !== 'backgroundColor',
})<{ backgroundColor: string }>(({ backgroundColor }) => ({
  alignItems: 'center',
  background: backgroundColor,
  borderRadius: borderRadius.full,
  color: colorTokens.textInverse,
  display: 'inline-flex',
  flexShrink: 0,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.bold,
  height: '2.25rem',
  justifyContent: 'center',
  minWidth: '2.25rem',
  width: '2.25rem',
}));

export const ApplicationMeta = styled(Box)({
  display: 'grid',
  gap: spacing[1],
  minWidth: 0,
});

export const ApplicationTitle = styled('span')({
  color: colorTokens.textPrimary,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.bold,
  lineHeight: 1.3,
});

export const ApplicationCompany = styled('span')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.xs,
  lineHeight: 1.3,
});

export const ApplicationLocation = styled('span')({
  alignItems: 'center',
  color: colorTokens.textTertiary,
  display: 'inline-flex',
  fontSize: fontSize.xs,
  gap: spacing[1],
  lineHeight: 1.3,
});

export const StatusBadge = styled('span', {
  shouldForwardProp: (prop) => !['background', 'color'].includes(String(prop)),
})<{ background: string; color: string }>(({ background, color }) => ({
  background,
  borderRadius: borderRadius.full,
  color,
  display: 'inline-flex',
  fontSize: fontSize.xs,
  fontWeight: fontWeight.bold,
  letterSpacing: '0.03em',
  lineHeight: 1,
  padding: `${spacing[1]} ${spacing[3]}`,
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
}));

export const SourceBadge = styled(StatusBadge)({});

export const PriorityBadge = styled(StatusBadge)({});

export const RowActions = styled(Box)({
  alignItems: 'center',
  display: 'inline-flex',
  gap: spacing[1],
});

export const RowActionButton = styled(IconButton)({
  '&:hover': {
    background: colorTokens.actionPrimarySubtle,
    color: colorTokens.actionPrimary,
  },
  borderRadius: borderRadius.lg,
  color: colorTokens.textSecondary,
  height: spacing[8],
  width: spacing[8],
});

export const PaginationBar = styled(Box)({
  alignItems: 'center',
  borderTop: `0.0625rem solid ${colorTokens.borderSubtle}`,
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing[4],
  justifyContent: 'space-between',
  padding: `${spacing[3]} ${spacing[4]}`,

  [compactBreakpoint]: {
    alignItems: 'stretch',
    flexDirection: 'column',
    gap: spacing[3],
    padding: spacing[3],
  },
});

export const PaginationControls = styled(Box)({
  alignItems: 'center',
  display: 'inline-flex',
  flexWrap: 'wrap',
  gap: spacing[1],
  justifyContent: 'center',

  [compactBreakpoint]: {
    width: '100%',
  },
});

export const PaginationButton = styled(MuiButton, {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>(({ active }) => ({
  '&:hover': {
    background: active ? colorTokens.actionPrimary : colorTokens.actionPrimarySurface,
    color: active ? colorTokens.textInverse : colorTokens.actionPrimary,
  },
  background: active ? colorTokens.actionPrimary : 'transparent',
  border: active ? 'transparent' : `0.0625rem solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.lg,
  color: active ? colorTokens.textInverse : colorTokens.textPrimary,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.bold,
  minHeight: spacing[8],
  minWidth: spacing[8],
  paddingInline: spacing[3],
  textTransform: 'none',
}));

export const PaginationPageSize = styled(Box)({
  [compactBreakpoint]: {
    width: '100%',
  },
});

export const ApplicationsGrid = styled(Box)({
  display: 'grid',
  gap: spacing[4],
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  padding: spacing[4],

  [tabletBreakpoint]: {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },

  [compactBreakpoint]: {
    gap: spacing[3],
    gridTemplateColumns: '1fr',
    padding: spacing[3],
  },
});

export const ApplicationCard = styled('article', {
  shouldForwardProp: (prop) => prop !== 'selected',
})<{ selected?: boolean }>(({ selected }) => ({
  '&:hover': {
    borderColor: selected ? colorTokens.actionPrimary : colorTokens.borderHover,
    boxShadow: shadows.card,
  },
  background: colorTokens.backgroundCard,
  border: `0.0625rem solid ${selected ? colorTokens.actionPrimary : colorTokens.borderSubtle}`,
  borderRadius: borderRadius.xl,
  boxShadow: selected ? shadows.focus : 'none',
  display: 'grid',
  gap: spacing[3],
  minWidth: 0,
  padding: spacing[4],
  transition: 'border-color 160ms ease, box-shadow 160ms ease',

  [compactBreakpoint]: {
    padding: spacing[3],
  },
}));

export const ApplicationCardHeader = styled(Box)({
  alignItems: 'flex-start',
  display: 'flex',
  gap: spacing[3],
  minWidth: 0,
});

export const ApplicationCardAvatar = styled(CompanyAvatar)({
  fontSize: fontSize.sm,
  height: '2.75rem',
  minWidth: '2.75rem',
  width: '2.75rem',
});

export const ApplicationCardMeta = styled(Box)({
  display: 'grid',
  gap: spacing[1],
  minWidth: 0,
});

export const ApplicationCardTitle = styled('h3')({
  color: colorTokens.textPrimary,
  fontSize: fontSize.base,
  fontWeight: fontWeight.bold,
  lineHeight: 1.3,
  margin: 0,
  overflowWrap: 'anywhere',

  [compactBreakpoint]: {
    fontSize: fontSize.sm,
  },
});

export const ApplicationCardCompany = styled('p')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.sm,
  lineHeight: 1.3,
  margin: 0,
});

export const ApplicationCardLocation = styled('p')({
  alignItems: 'center',
  color: colorTokens.textTertiary,
  display: 'inline-flex',
  flexWrap: 'wrap',
  fontSize: fontSize.xs,
  gap: spacing[1],
  lineHeight: 1.3,
  margin: 0,
});

export const ApplicationCardBadges = styled(Box)({
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing[2],
});

export const ApplicationCardInterest = styled(Box)({
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing[2],
});

export const ApplicationCardInterestLabel = styled('span')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
});

export const ApplicationCardFooter = styled(Box)({
  alignItems: 'flex-end',
  borderTop: `0.0625rem solid ${colorTokens.borderDefault}`,
  display: 'flex',
  gap: spacing[3],
  justifyContent: 'space-between',
  paddingTop: spacing[3],

  [compactBreakpoint]: {
    alignItems: 'stretch',
    flexDirection: 'column',
  },
});

export const ApplicationCardDates = styled(Box)({
  display: 'grid',
  gap: spacing[1],
});

export const ApplicationCardDate = styled('span')({
  color: colorTokens.textTertiary,
  fontSize: fontSize.xs,
  lineHeight: 1.3,
});

export const ApplicationCardActions = styled(RowActions)({
  [compactBreakpoint]: {
    justifyContent: 'flex-end',
  },
});

export const EmptyState = styled(Box)({
  alignItems: 'center',
  background: colorTokens.backgroundCard,
  border: `0.0625rem solid ${colorTokens.borderSubtle}`,
  borderRadius: borderRadius.xl,
  boxShadow: shadows.card,
  display: 'grid',
  gap: spacing[3],
  justifyItems: 'center',
  padding: `${spacing[8]} ${spacing[4]}`,
  textAlign: 'center',
  width: '100%',
});

export const EmptyStateIcon = styled(Box)({
  alignItems: 'center',
  background: colorTokens.actionPrimarySurface,
  borderRadius: borderRadius.full,
  color: colorTokens.actionPrimary,
  display: 'grid',
  height: spacing[12],
  justifyItems: 'center',
  width: spacing[12],
});

export const EmptyStateTitle = styled('h2')({
  color: colorTokens.textPrimary,
  fontSize: fontSize.lg,
  fontWeight: fontWeight.bold,
  margin: 0,
});

export const EmptyStateDescription = styled('p')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.sm,
  lineHeight: 1.5,
  margin: 0,
  maxWidth: '28rem',
});
