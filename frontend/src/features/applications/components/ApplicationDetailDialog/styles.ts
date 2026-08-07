import { Box, IconButton, styled } from '@/lib/material';
import { borderRadius, colorTokens, fontSize, fontWeight, palette, spacing } from '@/tokens';

import { ApplicationDialog } from '../ApplicationDialog/styles';

const mobileBreakpoint = '@media (max-width: 47.5rem)';

export const DetailApplicationDialog = styled(ApplicationDialog)({
  '& .MuiDialog-paper': {
    maxHeight:
      'min(52rem, calc(100dvh - 2rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)))',

    [mobileBreakpoint]: {
      maxHeight:
        'calc(100dvh - 1rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
    },
  },
});

export const DetailDialogBody = styled(Box)({
  display: 'flex',
  flex: '1 1 auto',
  flexDirection: 'column',
  gap: spacing[4],
  minHeight: 0,
  overflow: 'hidden',
  padding: `${spacing[2]} ${spacing[6]} ${spacing[4]}`,

  [mobileBreakpoint]: {
    padding: `${spacing[2]} ${spacing[4]} ${spacing[3]}`,
  },
});

export const DetailTabPanel = styled(Box)({
  alignContent: 'start',
  display: 'grid',
  flex: '1 1 auto',
  gap: spacing[4],
  minHeight: 0,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  paddingBottom: spacing[2],
  paddingRight: spacing[1],
  scrollbarGutter: 'stable',

  '&::-webkit-scrollbar': {
    width: '0.375rem',
  },

  '&::-webkit-scrollbar-thumb': {
    background: palette.gray300,
    borderRadius: borderRadius.full,
  },

  '&::-webkit-scrollbar-track': {
    background: palette.gray100,
    borderRadius: borderRadius.full,
  },
});

export const DetailTabBar = styled(Box)({
  borderBottom: `0.0625rem solid ${colorTokens.borderDefault}`,
  display: 'grid',
  flexShrink: 0,
  gap: 0,
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
});

export const DetailTab = styled('button', {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active: boolean }>(({ active }) => ({
  '&:focus-visible': {
    boxShadow: `${colorTokens.actionPrimarySubtle} 0 0 0 0.25rem`,
    outline: 0,
  },
  '&:hover': {
    background: active ? 'transparent' : palette.gray50,
    color: active ? colorTokens.actionPrimary : colorTokens.textPrimary,
  },
  alignItems: 'center',
  background: 'transparent',
  border: 0,
  borderBottom: `0.125rem solid ${active ? colorTokens.actionPrimary : 'transparent'}`,
  color: active ? colorTokens.actionPrimary : colorTokens.textSecondary,
  cursor: 'pointer',
  display: 'inline-flex',
  fontSize: fontSize.sm,
  fontWeight: active ? fontWeight.bold : fontWeight.medium,
  gap: spacing[2],
  justifyContent: 'center',
  lineHeight: 1.2,
  marginBottom: '-0.0625rem',
  minHeight: spacing[10],
  padding: `${spacing[3]} ${spacing[2]}`,
  transition: 'color 160ms ease, background 160ms ease, border-color 160ms ease',

  '& svg': {
    flexShrink: 0,
    fontSize: fontSize.base,
    opacity: active ? 1 : 0.72,
  },

  [mobileBreakpoint]: {
    flexDirection: 'column',
    fontSize: fontSize.xs,
    gap: spacing[1],
    minHeight: spacing[12],
    minWidth: 0,
    padding: `${spacing[2]} ${spacing[1]}`,
    whiteSpace: 'nowrap',
  },
}));

export const DetailPanel = styled(Box)({
  background: colorTokens.backgroundCard,
  border: `0.0625rem solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.xl,
  display: 'grid',
  gap: spacing[4],
  padding: spacing[5],

  [mobileBreakpoint]: {
    padding: spacing[4],
  },
});

export const DetailPanelHeader = styled(Box)({
  borderBottom: `0.0625rem solid ${colorTokens.borderSubtle}`,
  display: 'grid',
  gap: spacing[1],
  paddingBottom: spacing[3],
});

export const DetailPanelTitle = styled('h3')({
  color: colorTokens.textPrimary,
  fontSize: fontSize.base,
  fontWeight: fontWeight.bold,
  lineHeight: 1.25,
  margin: 0,
});

export const DetailPanelDescription = styled('p')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.sm,
  lineHeight: 1.45,
  margin: 0,
});

export const DetailMetaGrid = styled(Box)({
  background: palette.gray50,
  borderRadius: borderRadius.lg,
  display: 'grid',
  gap: spacing[4],
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  padding: spacing[4],

  [mobileBreakpoint]: {
    gridTemplateColumns: '1fr',
  },
});

export const DetailMetaValue = styled('span')({
  color: colorTokens.textPrimary,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  lineHeight: 1.5,
});

export const DetailDescription = styled('p')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.sm,
  lineHeight: 1.6,
  margin: 0,
  whiteSpace: 'pre-wrap',
});

export const SkillList = styled(Box)({
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing[2],
});

export const SkillChip = styled('span')({
  background: colorTokens.actionPrimarySurface,
  border: `0.0625rem solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.full,
  color: colorTokens.actionPrimary,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.bold,
  padding: `${spacing[1]} ${spacing[3]}`,
});

export const RecordList = styled(Box)({
  display: 'grid',
  gap: spacing[3],
});

export const RecordCard = styled(Box)({
  background: colorTokens.backgroundCard,
  border: `0.0625rem solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.xl,
  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
  display: 'grid',
  gap: spacing[2],
  padding: spacing[4],
});

export const RecordCardHeader = styled(Box)({
  alignItems: 'flex-start',
  display: 'flex',
  gap: spacing[3],
  justifyContent: 'space-between',
});

export const RecordCardTitle = styled('h4')({
  color: colorTokens.textPrimary,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.bold,
  lineHeight: 1.4,
  margin: 0,
});

export const RecordCardMeta = styled('span')({
  color: colorTokens.textTertiary,
  display: 'block',
  fontSize: fontSize.xs,
  lineHeight: 1.4,
  marginTop: spacing[1],
});

export const RecordCardContent = styled('p')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.sm,
  lineHeight: 1.55,
  margin: 0,
  whiteSpace: 'pre-wrap',
});

export const RecordCardActions = styled(Box)({
  alignItems: 'center',
  display: 'inline-flex',
  flexShrink: 0,
  gap: spacing[1],
});

export const RecordActionButton = styled(IconButton)({
  '&:hover': {
    background: colorTokens.actionPrimarySubtle,
    color: colorTokens.actionPrimary,
  },
  borderRadius: borderRadius.lg,
  color: colorTokens.textSecondary,
  height: spacing[8],
  width: spacing[8],
});

export const HistoryTimeline = styled(Box)({
  display: 'grid',
  gap: spacing[4],
  paddingTop: spacing[1],
});

export const HistoryItem = styled(Box)({
  background: palette.gray50,
  border: `0.0625rem solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.lg,
  display: 'grid',
  gap: spacing[1],
  padding: spacing[4],
  position: 'relative',

  '&::before': {
    background: colorTokens.actionPrimaryGradient,
    borderRadius: borderRadius.full,
    content: '""',
    height: '0.625rem',
    left: spacing[4],
    position: 'absolute',
    top: '-0.3125rem',
    width: '0.625rem',
  },
});

export const HistoryStatusChange = styled('span')({
  color: colorTokens.textPrimary,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.bold,
  lineHeight: 1.4,
});

export const HistoryNote = styled('span')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.sm,
  lineHeight: 1.5,
});

export const HeaderBadges = styled(Box)({
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing[2],
  marginBottom: spacing[1],
});

export const HeaderAvatar = styled('span', {
  shouldForwardProp: (prop) => prop !== 'backgroundColor',
})<{ backgroundColor: string }>(({ backgroundColor }) => ({
  alignItems: 'center',
  background: backgroundColor,
  borderRadius: borderRadius.full,
  boxShadow: '0 8px 24px rgba(37, 99, 235, 0.2)',
  color: colorTokens.textInverse,
  display: 'inline-flex',
  flexShrink: 0,
  fontSize: fontSize.lg,
  fontWeight: fontWeight.bold,
  height: spacing[12],
  justifyContent: 'center',
  width: spacing[12],

  [mobileBreakpoint]: {
    fontSize: fontSize.base,
    height: spacing[10],
    width: spacing[10],
  },
}));

export const HeaderLocation = styled('span')({
  alignItems: 'center',
  color: colorTokens.textTertiary,
  display: 'inline-flex',
  fontSize: fontSize.xs,
  gap: spacing[1],
  lineHeight: 1.4,
});

export const NotesComposer = styled(Box)({
  background: `linear-gradient(135deg, ${palette.blue50} 0%, ${colorTokens.backgroundCard} 100%)`,
  border: `0.0625rem solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.xl,
  display: 'grid',
  gap: spacing[4],
  padding: spacing[4],
});

export const NoteTypeGroup = styled(Box)({
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing[2],
});

export const NoteTypeChip = styled('button', {
  shouldForwardProp: (prop) => prop !== 'active' && prop !== 'accentColor',
})<{ accentColor: string; active: boolean }>(({ accentColor, active }) => ({
  '&:focus-visible': {
    boxShadow: `${colorTokens.actionPrimarySubtle} 0 0 0 0.25rem`,
    outline: 0,
  },
  '&:hover': {
    borderColor: active ? accentColor : colorTokens.borderHover,
    transform: 'translateY(-1px)',
  },
  background: active ? `${accentColor}14` : colorTokens.backgroundCard,
  border: `0.0625rem solid ${active ? accentColor : colorTokens.borderDefault}`,
  borderRadius: borderRadius.full,
  color: active ? accentColor : colorTokens.textSecondary,
  cursor: 'pointer',
  fontSize: fontSize.xs,
  fontWeight: active ? fontWeight.bold : fontWeight.medium,
  lineHeight: 1,
  padding: `${spacing[2]} ${spacing[3]}`,
  transition: 'border-color 160ms ease, background 160ms ease, transform 160ms ease',
}));

export const NotesDivider = styled('hr')({
  border: 0,
  borderTop: `0.0625rem solid ${colorTokens.borderDefault}`,
  margin: 0,
  width: '100%',
});

export const NotesListHeader = styled(Box)({
  alignItems: 'center',
  display: 'flex',
  gap: spacing[2],
  justifyContent: 'space-between',
});

export const NotesListTitle = styled('span')({
  color: colorTokens.textPrimary,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.bold,
});

export const NotesListCount = styled('span')({
  background: colorTokens.actionPrimarySurface,
  borderRadius: borderRadius.full,
  color: colorTokens.actionPrimary,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.bold,
  lineHeight: 1,
  padding: `${spacing[1]} ${spacing[3]}`,
});

export const NoteEntry = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'accentColor',
})<{ accentColor: string }>(({ accentColor }) => ({
  background: colorTokens.backgroundCard,
  border: `0.0625rem solid ${colorTokens.borderDefault}`,
  borderLeft: `0.25rem solid ${accentColor}`,
  borderRadius: borderRadius.lg,
  boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
  display: 'grid',
  gap: spacing[3],
  padding: spacing[4],
}));

export const NoteEntryHeader = styled(Box)({
  alignItems: 'flex-start',
  display: 'flex',
  gap: spacing[3],
  justifyContent: 'space-between',
});

export const NoteEntryMeta = styled(Box)({
  display: 'grid',
  gap: spacing[1],
});

export const NoteTypeBadge = styled('span', {
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

export const NoteEntryDate = styled('span')({
  alignItems: 'center',
  color: colorTokens.textTertiary,
  display: 'inline-flex',
  fontSize: fontSize.xs,
  gap: spacing[1],
  lineHeight: 1.4,
});

export const NoteEntryContent = styled('p')({
  background: palette.gray50,
  borderRadius: borderRadius.lg,
  color: colorTokens.textPrimary,
  fontSize: fontSize.sm,
  lineHeight: 1.6,
  margin: 0,
  padding: spacing[3],
  whiteSpace: 'pre-wrap',
});

export const NotesComposerActions = styled(Box)({
  display: 'flex',
  justifyContent: 'flex-end',
});
