import { Box, styled } from '@/lib/material';

import {
  border,
  borderRadius,
  colorTokens,
  fontSize,
  fontWeight,
  muted,
  panel,
  pill,
  spacing,
  t,
} from '../../styles/shared';

export { CardTitle, CardSubtitle, EmptyText, FileTile } from '../../styles/shared';

export const ResumeListCard = styled(Box)({
  ...panel,
  gap: spacing[4],
  padding: spacing[5],

  '& .list-header': {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
  },
  '& .resume-meta': { display: 'grid', gap: spacing[2], minWidth: 0 },
  '& .resume-name': {
    color: t.text,
    fontWeight: fontWeight.extraBold,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  '& .resume-subtext': { ...muted, fontSize: fontSize.xs },
  '& .badge-row': { alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: spacing[2] },
  '& .resume-version': { ...muted, fontWeight: fontWeight.medium },
  '& .more-icon': { color: t.textMuted },
  '& .footer-notice': {
    alignItems: 'center',
    background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
    border,
    borderRadius: borderRadius.xl,
    display: 'flex',
    gap: spacing[3],
    padding: spacing[4],
  },
  '& .security-icon': { color: colorTokens.feedbackSuccess },
  '& .footer-text': muted,
});

export const ResumeRow = styled(Box)({
  alignItems: 'center',
  background: `linear-gradient(180deg, ${t.background}, ${t.surfaceSubtle})`,
  border,
  borderRadius: borderRadius.xl,
  display: 'grid',
  gap: spacing[4],
  gridTemplateColumns: '3.25rem minmax(0, 1fr) auto auto 2rem',
  padding: spacing[4],
  '&:hover': {
    borderColor: 'rgba(37, 99, 235, 0.28)',
    boxShadow: t.rowShadow,
  },
  '@media (max-width: 48rem)': {
    gridTemplateColumns: '3.25rem minmax(0, 1fr)',
    '& > .resume-actions, & > .resume-version, & > .resume-menu': { gridColumn: '2' },
  },
});

export const StatusPill = styled(Box)({
  ...pill,
  background: colorTokens.feedbackSuccessSurface,
  border: '1px solid rgba(22,163,74,0.14)',
  color: colorTokens.feedbackSuccess,
  fontWeight: fontWeight.bold,
  lineHeight: 1,
  padding: '0.35rem 0.55rem',
});
