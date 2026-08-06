import { Box, Dialog, IconButton, MuiButton, Radio, styled } from '@/lib/material';
import {
  borderRadius,
  colorTokens,
  fontSize,
  fontWeight,
  jobFeedTokens,
  palette,
  shadows,
  spacing,
} from '@/tokens';

const mobileBreakpoint = '@media (max-width: 47.5rem)';

export const ApplicationDialog = styled(Dialog)({
  '& .MuiBackdrop-root': {
    backdropFilter: 'blur(4px)',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  '& .MuiDialog-container': {
    alignItems: 'center',
    padding: `max(${spacing[3]}, env(safe-area-inset-top, 0px)) ${spacing[3]} max(${spacing[3]}, env(safe-area-inset-bottom, 0px))`,

    [mobileBreakpoint]: {
      alignItems: 'flex-end',
      padding: `max(${spacing[2]}, env(safe-area-inset-top, 0px)) ${spacing[2]} max(${spacing[2]}, env(safe-area-inset-bottom, 0px))`,
    },
  },
  '& .MuiDialog-paper': {
    border: `0.0625rem solid ${colorTokens.borderDefault}`,
    borderRadius: borderRadius['2xl'],
    boxShadow: '0 24px 80px rgba(33, 83, 166, 0.18)',
    display: 'flex',
    flexDirection: 'column',
    margin: 0,
    maxHeight:
      'min(52rem, calc(100dvh - 2rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)))',
    maxWidth: '44rem',
    overflow: 'hidden',
    width: '100%',

    [mobileBreakpoint]: {
      borderBottomLeftRadius: borderRadius.xl,
      borderBottomRightRadius: borderRadius.xl,
      borderTopLeftRadius: borderRadius['2xl'],
      borderTopRightRadius: borderRadius['2xl'],
      maxHeight:
        'calc(100dvh - 1rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
      width: '100%',
    },
  },
});

export const DialogHeaderAccent = styled('div')({
  background: colorTokens.actionPrimaryGradient,
  height: '0.25rem',
  width: '100%',
});

export const DialogHeader = styled(Box)({
  alignItems: 'flex-start',
  background: `linear-gradient(180deg, ${palette.blue50} 0%, ${colorTokens.backgroundCard} 100%)`,
  display: 'flex',
  flexShrink: 0,
  gap: spacing[4],
  justifyContent: 'space-between',
  padding: `${spacing[5]} ${spacing[6]} ${spacing[4]}`,

  [mobileBreakpoint]: {
    padding: `${spacing[4]} ${spacing[4]} ${spacing[3]}`,
  },
});

export const DialogHeaderContent = styled(Box)({
  alignItems: 'flex-start',
  display: 'flex',
  gap: spacing[4],
  minWidth: 0,
});

export const DialogHeaderIcon = styled('span')({
  alignItems: 'center',
  background: colorTokens.actionPrimaryGradient,
  borderRadius: borderRadius.xl,
  boxShadow: '0 8px 24px rgba(37, 99, 235, 0.25)',
  color: colorTokens.textInverse,
  display: 'inline-flex',
  flexShrink: 0,
  height: spacing[12],
  justifyContent: 'center',
  width: spacing[12],

  '& svg': {
    fontSize: fontSize['2xl'],
  },

  [mobileBreakpoint]: {
    height: spacing[10],
    width: spacing[10],

    '& svg': {
      fontSize: fontSize.xl,
    },
  },
});

export const DialogTitleGroup = styled(Box)({
  display: 'grid',
  gap: spacing[1],
  minWidth: 0,
});

export const DialogEyebrow = styled('p')({
  color: colorTokens.actionPrimary,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.extraBold,
  letterSpacing: '0.1em',
  lineHeight: 1.2,
  margin: 0,
  textTransform: 'uppercase',
});

export const DialogTitleText = styled('h2')({
  color: colorTokens.textPrimary,
  fontSize: fontSize['2xl'],
  fontWeight: fontWeight.extraBold,
  lineHeight: 1.15,
  margin: 0,

  [mobileBreakpoint]: {
    fontSize: fontSize.xl,
  },
});

export const DialogSubtitle = styled('p')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.sm,
  lineHeight: 1.5,
  margin: 0,
  maxWidth: '28rem',
});

export const CloseButton = styled(IconButton)({
  '&:hover': {
    background: colorTokens.actionPrimarySubtle,
    color: colorTokens.actionPrimary,
  },
  borderRadius: borderRadius.lg,
  color: colorTokens.textSecondary,
  flexShrink: 0,
  height: spacing[10],
  width: spacing[10],
});

export const DialogBody = styled(Box)({
  display: 'grid',
  flex: '1 1 auto',
  gap: spacing[5],
  minHeight: 0,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  padding: `${spacing[2]} ${spacing[6]} ${spacing[5]}`,
  WebkitOverflowScrolling: 'touch',

  [mobileBreakpoint]: {
    gap: spacing[4],
    padding: `${spacing[2]} ${spacing[4]} ${spacing[4]}`,
  },
});

export const SectionCard = styled(Box)({
  background: colorTokens.backgroundCard,
  border: `0.0625rem solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.xl,
  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
  display: 'grid',
  gap: spacing[4],
  padding: spacing[5],

  [mobileBreakpoint]: {
    padding: spacing[4],
  },
});

export const SectionHeader = styled(Box)({
  alignItems: 'flex-start',
  display: 'flex',
  gap: spacing[3],
});

export const SectionHeaderIcon = styled('span')({
  alignItems: 'center',
  background: colorTokens.actionPrimarySurface,
  borderRadius: borderRadius.lg,
  color: colorTokens.actionPrimary,
  display: 'inline-flex',
  flexShrink: 0,
  height: spacing[10],
  justifyContent: 'center',
  width: spacing[10],

  '& svg': {
    fontSize: fontSize.lg,
  },
});

export const SectionHeaderText = styled(Box)({
  display: 'grid',
  gap: spacing[1],
  minWidth: 0,
});

export const SectionTitle = styled('h3')({
  color: colorTokens.textPrimary,
  fontSize: fontSize.base,
  fontWeight: fontWeight.bold,
  lineHeight: 1.25,
  margin: 0,
});

export const SectionDescription = styled('p')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.sm,
  lineHeight: 1.45,
  margin: 0,
});

export const SectionContent = styled(Box)({
  display: 'grid',
  gap: spacing[4],
});

export const EntryModeTabs = styled('div', {
  shouldForwardProp: (prop) => prop !== 'columns',
})<{ columns?: number }>(({ columns = 2 }) => ({
  display: 'grid',
  gap: spacing[3],
  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,

  [mobileBreakpoint]: {
    gridTemplateColumns: '1fr',
  },
}));

export const EntryModeTab = styled('button', {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active: boolean }>(({ active }) => ({
  '&:focus-visible': {
    boxShadow: shadows.focus,
    outline: 0,
  },
  '&:hover': {
    borderColor: active ? colorTokens.actionPrimary : colorTokens.borderHover,
    transform: 'translateY(-1px)',
  },
  alignItems: 'flex-start',
  background: active
    ? `linear-gradient(135deg, ${palette.blue50} 0%, ${colorTokens.backgroundCard} 100%)`
    : colorTokens.backgroundCard,
  border: `0.0625rem solid ${active ? colorTokens.actionPrimary : colorTokens.borderDefault}`,
  borderRadius: borderRadius.xl,
  boxShadow: active ? '0 8px 24px rgba(37, 99, 235, 0.12)' : 'none',
  color: colorTokens.textPrimary,
  cursor: 'pointer',
  display: 'grid',
  gap: spacing[3],
  padding: spacing[4],
  textAlign: 'left',
  transition:
    'border-color 180ms ease, background 180ms ease, box-shadow 180ms ease, transform 180ms ease',

  [mobileBreakpoint]: {
    alignItems: 'center',
    gridTemplateColumns: 'auto 1fr',
  },
}));

export const EntryModeTabIcon = styled('span', {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active: boolean }>(({ active }) => ({
  alignItems: 'center',
  background: active ? colorTokens.actionPrimaryGradient : palette.gray100,
  borderRadius: borderRadius.lg,
  color: active ? colorTokens.textInverse : colorTokens.textSecondary,
  display: 'inline-flex',
  height: spacing[10],
  justifyContent: 'center',
  transition: 'background 180ms ease, color 180ms ease',
  width: spacing[10],

  '& svg': {
    fontSize: fontSize.lg,
  },
}));

export const EntryModeTabText = styled(Box)({
  display: 'grid',
  gap: spacing[1],
  minWidth: 0,
});

export const EntryModeTabLabel = styled('span', {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active: boolean }>(({ active }) => ({
  color: active ? colorTokens.actionPrimary : colorTokens.textPrimary,
  fontSize: fontSize.sm,
  fontWeight: active ? fontWeight.bold : fontWeight.semiBold,
  lineHeight: 1.3,
}));

export const EntryModeTabDescription = styled('span')({
  color: colorTokens.textTertiary,
  fontSize: fontSize.xs,
  lineHeight: 1.4,
});

export const FormGrid = styled(Box)({
  display: 'grid',
  gap: spacing[4],
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',

  [mobileBreakpoint]: {
    gridTemplateColumns: '1fr',
  },
});

export const FormGridFull = styled(Box)({
  gridColumn: '1 / -1',
});

export const FieldGroup = styled(Box)({
  display: 'grid',
  gap: spacing[2],
});

export const FieldLabel = styled('label')({
  color: colorTokens.textPrimary,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semiBold,
  lineHeight: 1.3,
});

export const FieldHint = styled('span')({
  color: colorTokens.textTertiary,
  fontSize: fontSize.xs,
  lineHeight: 1.4,
});

export const FieldError = styled('p')({
  color: colorTokens.feedbackError,
  fontSize: fontSize.xs,
  lineHeight: 1.4,
  margin: 0,
});

export const FieldErrorBanner = styled(Box)({
  background: colorTokens.feedbackErrorSurface,
  border: `0.0625rem solid ${palette.red100}`,
  borderRadius: borderRadius.lg,
  color: colorTokens.feedbackError,
  fontSize: fontSize.sm,
  lineHeight: 1.45,
  padding: `${spacing[3]} ${spacing[4]}`,
});

export const SalaryRow = styled(Box)({
  alignItems: 'start',
  display: 'grid',
  gap: spacing[3],
  gridTemplateColumns: '1fr auto 1fr minmax(6rem, auto)',

  [mobileBreakpoint]: {
    gridTemplateColumns: '1fr 1fr',
  },
});

export const SalaryField = styled(Box)({
  display: 'grid',
  gap: spacing[1],
  gridTemplateRows: 'auto minmax(1.125rem, auto)',
  minWidth: 0,
});

export const SalaryFieldError = styled('span')({
  color: colorTokens.feedbackError,
  fontSize: fontSize.xs,
  lineHeight: 1.25,
  minHeight: '1.125rem',
});

export const SalaryDash = styled('span')({
  alignSelf: 'start',
  color: colorTokens.textTertiary,
  fontSize: fontSize.lg,
  lineHeight: spacing[10],
  textAlign: 'center',

  [mobileBreakpoint]: {
    display: 'none',
  },
});

export const PriorityGroup = styled(Box)({
  display: 'grid',
  gap: spacing[2],
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
});

export const PriorityButton = styled('button', {
  shouldForwardProp: (prop) => prop !== 'active' && prop !== 'level',
})<{ active: boolean; level: 'low' | 'medium' | 'high' }>(({ active, level }) => {
  const levelStyles = {
    high: {
      activeBg: palette.red50,
      activeBorder: palette.red500,
      activeColor: palette.red700,
    },
    low: {
      activeBg: palette.gray100,
      activeBorder: palette.gray400,
      activeColor: palette.gray700,
    },
    medium: {
      activeBg: colorTokens.actionPrimarySurface,
      activeBorder: colorTokens.actionPrimary,
      activeColor: colorTokens.actionPrimary,
    },
  }[level];

  return {
    '&:focus-visible': {
      boxShadow: shadows.focus,
      outline: 0,
    },
    '&:hover': {
      borderColor: active ? levelStyles.activeBorder : colorTokens.borderHover,
    },
    background: active ? levelStyles.activeBg : colorTokens.backgroundCard,
    border: `0.0625rem solid ${active ? levelStyles.activeBorder : colorTokens.borderDefault}`,
    borderRadius: borderRadius.lg,
    color: active ? levelStyles.activeColor : colorTokens.textPrimary,
    cursor: 'pointer',
    fontSize: fontSize.sm,
    fontWeight: active ? fontWeight.bold : fontWeight.medium,
    minHeight: spacing[10],
    paddingInline: spacing[3],
    transition: 'border-color 160ms ease, background 160ms ease, color 160ms ease',
  };
});

export const InterestField = styled(Box)({
  alignItems: 'center',
  background: palette.gray50,
  border: `0.0625rem solid ${colorTokens.borderSubtle}`,
  borderRadius: borderRadius.lg,
  display: 'flex',
  justifyContent: 'space-between',
  padding: `${spacing[3]} ${spacing[4]}`,
});

export const InterestHint = styled('span')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
});

export const InfoBanner = styled(Box)({
  alignItems: 'flex-start',
  background: `linear-gradient(135deg, ${palette.blue50} 0%, ${colorTokens.backgroundCard} 100%)`,
  border: `0.0625rem solid ${colorTokens.actionPrimarySubtle}`,
  borderRadius: borderRadius.lg,
  color: colorTokens.textSecondary,
  display: 'flex',
  fontSize: fontSize.sm,
  gap: spacing[3],
  lineHeight: 1.5,
  padding: spacing[4],

  '& svg': {
    color: colorTokens.actionPrimary,
    flexShrink: 0,
    marginTop: '0.125rem',
  },
});

export const FetchRow = styled(Box)({
  alignItems: 'stretch',
  display: 'grid',
  gap: spacing[3],
  gridTemplateColumns: '1fr auto',

  [mobileBreakpoint]: {
    gridTemplateColumns: '1fr',
  },
});

export const SearchFieldWrap = styled(Box)({
  '& .MuiOutlinedInput-root': {
    background: palette.gray50,
    borderRadius: borderRadius.lg,
  },
});

export const JobFeedFilters = styled(Box)({
  display: 'grid',
  gap: spacing[3],
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',

  [mobileBreakpoint]: {
    gridTemplateColumns: '1fr',
  },
});

export const JobFeedList = styled('div')({
  display: 'grid',
  gap: spacing[3],
  maxHeight: '16rem',
  overflowY: 'auto',
  paddingRight: spacing[1],

  '&::-webkit-scrollbar': {
    width: '0.375rem',
  },

  '&::-webkit-scrollbar-thumb': {
    background: jobFeedTokens.scrollbarThumb,
    borderRadius: borderRadius.full,
  },

  '&::-webkit-scrollbar-track': {
    background: jobFeedTokens.scrollbarTrack,
    borderRadius: borderRadius.full,
  },
});

export const JobFeedOption = styled('label', {
  shouldForwardProp: (prop) => prop !== 'selected',
})<{ selected: boolean }>(({ selected }) => ({
  '&:hover': {
    borderColor: selected ? colorTokens.actionPrimary : colorTokens.borderHover,
    boxShadow: '0 4px 16px rgba(15, 23, 42, 0.06)',
  },
  alignItems: 'center',
  background: selected
    ? `linear-gradient(135deg, ${palette.blue50} 0%, ${colorTokens.backgroundCard} 100%)`
    : colorTokens.backgroundCard,
  border: `0.0625rem solid ${selected ? colorTokens.actionPrimary : colorTokens.borderDefault}`,
  borderRadius: borderRadius.xl,
  boxShadow: selected ? '0 8px 24px rgba(37, 99, 235, 0.1)' : 'none',
  cursor: 'pointer',
  display: 'grid',
  gap: spacing[3],
  gridTemplateColumns: 'auto minmax(0, 1fr) auto',
  padding: spacing[4],
  transition: 'border-color 180ms ease, background 180ms ease, box-shadow 180ms ease',
}));

export const JobFeedTrailing = styled(Box)({
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'column',
  gap: spacing[2],
});

export const JobFeedAvatar = styled('span', {
  shouldForwardProp: (prop) => prop !== 'backgroundColor',
})<{ backgroundColor: string }>(({ backgroundColor }) => ({
  alignItems: 'center',
  background: backgroundColor,
  borderRadius: borderRadius.full,
  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)',
  color: colorTokens.textInverse,
  display: 'inline-flex',
  fontSize: fontSize.sm,
  fontWeight: fontWeight.bold,
  height: '3rem',
  justifyContent: 'center',
  width: '3rem',
}));

export const JobFeedMeta = styled(Box)({
  display: 'grid',
  gap: spacing[1],
  minWidth: 0,
});

export const JobFeedTitle = styled('span')({
  color: colorTokens.textPrimary,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.bold,
  lineHeight: 1.35,
});

export const JobFeedCompany = styled('span')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  lineHeight: 1.3,
});

export const JobFeedDetails = styled('span')({
  alignItems: 'center',
  color: colorTokens.textTertiary,
  display: 'inline-flex',
  fontSize: fontSize.xs,
  gap: spacing[1],
  lineHeight: 1.3,
});

export const MatchBadge = styled('span')({
  background: colorTokens.feedbackSuccessSurface,
  border: `0.0625rem solid ${colorTokens.borderSuccess}`,
  borderRadius: borderRadius.full,
  color: colorTokens.feedbackSuccess,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.bold,
  padding: `${spacing[1]} ${spacing[3]}`,
  whiteSpace: 'nowrap',
});

export const JobFeedRadio = styled(Radio)({
  color: colorTokens.textTertiary,
  padding: 0,

  '&.Mui-checked': {
    color: colorTokens.actionPrimary,
  },
});

export const JobFeedEmpty = styled(Box)({
  alignItems: 'center',
  background: palette.gray50,
  border: `0.0625rem dashed ${colorTokens.borderSubtle}`,
  borderRadius: borderRadius.xl,
  color: colorTokens.textSecondary,
  display: 'grid',
  gap: spacing[2],
  justifyItems: 'center',
  padding: spacing[8],
  textAlign: 'center',
});

export const JobFeedEmptyTitle = styled('span')({
  color: colorTokens.textPrimary,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.bold,
});

export const JobFeedEmptyText = styled('span')({
  fontSize: fontSize.sm,
  lineHeight: 1.5,
  maxWidth: '16rem',
});

export const DialogFooter = styled(Box)({
  alignItems: 'center',
  background: palette.gray50,
  borderTop: `0.0625rem solid ${colorTokens.borderDefault}`,
  display: 'flex',
  flexShrink: 0,
  flexWrap: 'wrap',
  gap: spacing[3],
  justifyContent: 'space-between',
  padding: `${spacing[4]} ${spacing[6]} ${spacing[5]}`,

  [mobileBreakpoint]: {
    padding: `${spacing[3]} ${spacing[4]} calc(${spacing[4]} + env(safe-area-inset-bottom, 0px))`,
  },
});

export const DialogFooterNote = styled('p')({
  alignItems: 'center',
  color: colorTokens.textSecondary,
  display: 'flex',
  fontSize: fontSize.sm,
  gap: spacing[2],
  lineHeight: 1.4,
  margin: 0,
  maxWidth: '18rem',

  '& svg': {
    color: colorTokens.actionPrimary,
    flexShrink: 0,
  },

  [mobileBreakpoint]: {
    maxWidth: 'none',
    width: '100%',
  },
});

export const DialogFooterActions = styled(Box)({
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing[3],
  marginLeft: 'auto',

  [mobileBreakpoint]: {
    marginLeft: 0,
    width: '100%',

    '& .MuiButton-root': {
      flex: '1 1 auto',
    },
  },
});

export const FetchButton = styled(MuiButton)({
  '&:hover': {
    background: colorTokens.actionPrimaryGradient,
    borderColor: 'transparent',
    color: colorTokens.textInverse,
  },
  background: colorTokens.backgroundCard,
  border: `0.0625rem solid ${colorTokens.actionPrimary}`,
  borderRadius: borderRadius.lg,
  color: colorTokens.actionPrimary,
  flexShrink: 0,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.bold,
  minHeight: spacing[10],
  paddingInline: spacing[4],
  textTransform: 'none',
  transition: 'background 180ms ease, color 180ms ease, border-color 180ms ease',
  whiteSpace: 'nowrap',

  [mobileBreakpoint]: {
    width: '100%',
  },
});

// Legacy alias kept for any external imports
export const FormSection = SectionContent;
