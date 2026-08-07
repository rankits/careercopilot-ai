import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import {
  borderRadius,
  fontSize,
  fontWeight,
  iconBox,
  muted,
  panel,
  scrollableMultilineSx,
  spacing,
  stepPadding,
  t,
  title,
} from '../../styles/shared';

export { EmptyText, FileTile, ScoreBadge } from '../../styles/shared';

export const DefineRoleShell = styled(Box)({
  display: 'grid',
  gap: spacing[4],
  gridTemplateColumns: '1fr',
  minWidth: 0,
  overflowX: 'hidden',
  width: '100%',
  ...stepPadding,
  '@media (max-width: 48rem)': {
    gap: spacing[3],
  },

  '& .section-heading': { display: 'grid', gap: spacing[1] },
  '& .step-title': {
    ...title,
    fontSize: fontSize['2xl'],
    lineHeight: 1.2,
    '& span': { color: t.primary },
  },
  '& .content-row': {
    alignItems: 'start',
    display: 'grid',
    gap: spacing[4],
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 22.5rem)',
    minWidth: 0,
    '@media (max-width: 72rem)': { gridTemplateColumns: '1fr' },
    '@media (max-width: 48rem)': { gap: spacing[3] },
  },
  '& .role-card': {
    ...panel,
    background: 'rgba(255,255,255,0.94)',
    gap: spacing[3],
    minWidth: 0,
  },
  '& .form-group': { display: 'grid', gap: spacing[1] },
  '& .form-grid-two': {
    display: 'grid',
    gap: spacing[3],
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    '@media (max-width: 42rem)': { gridTemplateColumns: '1fr' },
  },
  '& .aside': { alignSelf: 'start', display: 'grid', gap: spacing[4], minWidth: 0 },
  '& .aside-card': {
    ...panel,
    background: 'rgba(255,255,255,0.96)',
  },
  '& .aside-title': { ...title, fontSize: fontSize.base },
  '& .uploaded-resume': {
    alignItems: 'center',
    background: `linear-gradient(135deg, ${t.background}, ${t.primarySofter})`,
    border: '1px solid rgba(37, 99, 235, 0.16)',
    borderRadius: borderRadius.xl,
    display: 'grid',
    gap: spacing[3],
    gridTemplateColumns: '3.25rem minmax(0, 1fr)',
    padding: spacing[3],
  },
  '& .resume-name': {
    color: t.text,
    fontWeight: fontWeight.extraBold,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  '& .resume-subtext': { ...muted, fontSize: fontSize.xs },
  '& .stats-grid': {
    display: 'grid',
    gap: spacing[3],
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
  '& .stat-label': { ...muted, fontSize: fontSize.xs },
  '& .stat-value': { ...title, fontSize: fontSize.lg },
  '& .next-list': { display: 'grid', gap: spacing[3] },
  '& .next-item': { alignItems: 'center', display: 'flex', gap: spacing[3] },
  '& .next-icon': iconBox(),
  '& .next-text': { color: t.text, fontSize: fontSize.sm, fontWeight: fontWeight.semiBold },
  '& .version-grid': { display: 'grid', gap: spacing[3] },
  '& .version-card': { ...panel, padding: spacing[3] },
  '& .version-header': {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
  },
  '& .version-title': { ...title, fontSize: fontSize.sm },
});

export const FormLabel = styled(Typography)({
  color: t.text,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semiBold,
});

export const FormInputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: borderRadius.xl,
    minHeight: '2.75rem',
  },
};

export const JobDescriptionInputSx = {
  ...FormInputSx,
  ...scrollableMultilineSx,
  '& .MuiOutlinedInput-root': {
    ...FormInputSx['& .MuiOutlinedInput-root'],
    height: '11rem',
    maxHeight: '11rem',
    overflowY: 'auto',
  },
  '& .MuiInputBase-inputMultiline': {
    height: '100% !important',
    maxHeight: '9.5rem',
    overflowY: 'auto !important',
    resize: 'none',
  },
};
