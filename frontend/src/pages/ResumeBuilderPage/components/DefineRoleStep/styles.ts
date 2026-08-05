import { Box, Typography, styled } from '@/lib/material';

import {
  borderRadius,
  fontSize,
  fontWeight,
  iconBox,
  muted,
  panel,
  spacing,
  t,
  title,
} from '../../styles/shared';

export { EmptyText, FileTile, ScoreBadge } from '../../styles/shared';

export const DefineRoleShell = styled(Box)({
  display: 'grid',
  gap: spacing[5],
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 22.5rem)',
  minWidth: 0,
  overflowX: 'hidden',
  padding: `${spacing[5]} ${spacing[7]} ${spacing[6]}`,
  width: '100%',
  '@media (max-width: 72rem)': { gridTemplateColumns: '1fr' },
  '@media (max-width: 48rem)': {
    gap: spacing[3],
    padding: `${spacing[3]} ${spacing[3]} ${spacing[5]}`,
  },

  '& .main': { alignContent: 'start', display: 'grid', gap: spacing[3], minWidth: 0 },
  '& .section-heading': { display: 'grid', gap: spacing[2] },
  '& .step-title': {
    ...title,
    fontSize: fontSize['2xl'],
    lineHeight: 1.2,
    '& span': { color: t.primary },
  },
  '& .role-card': {
    ...panel,
    background: 'rgba(255,255,255,0.94)',
    boxShadow: '0 22px 70px rgba(17,24,39,0.07)',
    padding: spacing[5],
  },
  '& .form-group': { display: 'grid', gap: spacing[2] },
  '& .form-grid-two': {
    display: 'grid',
    gap: spacing[4],
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    '@media (max-width: 42rem)': { gridTemplateColumns: '1fr' },
  },
  '& .role-tip': {
    alignItems: 'center',
    background: `linear-gradient(135deg, ${t.primarySoft}, ${t.background})`,
    border: '1px solid rgba(37, 99, 235, 0.16)',
    borderRadius: borderRadius['2xl'],
    color: t.primary,
    display: 'grid',
    gap: spacing[3],
    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
    padding: spacing[3],
    '@media (max-width: 42rem)': {
      alignItems: 'flex-start',
      gridTemplateColumns: 'auto minmax(0, 1fr)',
    },
  },
  '& .tip-title': {
    color: t.primaryHover,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
  },
  '& .tip-text': { ...muted, fontSize: fontSize.xs, lineHeight: 1.55 },
  '& .tip-actions': {
    alignItems: 'center',
    display: 'flex',
    gap: spacing[2],
    justifyContent: 'flex-end',
    '@media (max-width: 42rem)': {
      gridColumn: '1 / -1',
      width: '100%',
      '& > button': { flex: 1 },
    },
  },
  '& .role-actions': {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing[3],
    justifyContent: 'flex-end',
    marginTop: spacing[2],
  },
  '& .aside': { alignSelf: 'start', display: 'grid', gap: spacing[4] },
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

export const DefineRoleNextButtonSx = { minWidth: '6.25rem' };
