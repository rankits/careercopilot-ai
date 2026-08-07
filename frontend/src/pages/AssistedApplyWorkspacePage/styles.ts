import type { SxProps, Theme } from '@mui/material/styles';

export const assistedApplyWorkspaceSx = {
  root: {
    maxWidth: 1500,
    mx: 'auto',
    overflowX: 'hidden',
    p: { xs: 2, sm: 3, md: 4 },
    pb: { xs: 10, md: 4 },
  },
  backLink: {
    alignSelf: 'flex-start',
    mb: 1,
    px: 0,
  },
  pageHeader: {
    alignItems: { xs: 'stretch', sm: 'flex-start' },
    mb: 2,
    position: 'relative',
    zIndex: 2,
  },
  pageTitle: {
    fontSize: { xs: '1.5rem', sm: '2.125rem' },
    fontWeight: 700,
    letterSpacing: '-0.03em',
  },
  pageTitleRow: {
    alignItems: 'center',
    flexWrap: 'wrap',
    mb: 0.5,
  },
  pageSubtitle: {
    overflowWrap: 'anywhere',
  },
  headerActions: {
    alignSelf: { xs: 'flex-end', sm: 'auto' },
    flexShrink: 0,
  },
  stepContentShell: {
    border: 1,
    borderColor: 'divider',
    borderRadius: 1,
    flex: 1,
    maxWidth: '100%',
    minHeight: 200,
    minWidth: 0,
    overflowX: 'hidden',
    p: { xs: 2, sm: 3 },
  },
  stepLayout: {
    alignItems: 'stretch',
  },
  timelineAside: {
    flexShrink: 0,
    minWidth: 0,
    width: { xs: '100%', lg: 300 },
  },
  stepRoot: {
    maxWidth: '100%',
    minWidth: 0,
  },
  overflowWrap: {
    overflowWrap: 'anywhere',
  },
  alertWithAction: {
    alignItems: { xs: 'flex-start', sm: 'center' },
    flexDirection: { xs: 'column', sm: 'row' },
    '& .MuiAlert-action': {
      alignSelf: { xs: 'stretch', sm: 'auto' },
      ml: { xs: 0, sm: 'auto' },
      mt: { xs: 1, sm: 0 },
      pl: 0,
    },
  },
  dialogActions: {
    flexDirection: { xs: 'column', sm: 'row' },
    gap: { xs: 1, sm: 0 },
    px: 3,
    pb: 2,
  },
  fullWidthMobileButton: {
    width: { lg: 'auto' },
  },
  stackedActionButtons: {
    alignItems: 'stretch',
    width: '100%',
  },
  workspaceActionsMenuPaper: {
    minWidth: 220,
    maxWidth: 'min(280px, calc(100vw - 32px))',
    mt: { xs: 0, md: 0.5 },
    mb: { xs: 0.5, md: 0 },
  },
} satisfies Record<string, SxProps<Theme>>;
