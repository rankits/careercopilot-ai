import { Box, LinearProgress, styled } from '@/lib/material';
import { colorTokens } from '@/tokens';

import {
  border,
  borderRadius,
  fontSize,
  fontWeight,
  iconBox,
  muted,
  spacing,
  t,
  title,
} from '../../styles/shared';

export const HeroHeader = styled(Box)({
  alignItems: 'center',
  background: colorTokens.backgroundCard,
  borderBottom: border,
  boxSizing: 'border-box',
  display: 'grid',
  gap: spacing[4],
  gridTemplateColumns: 'minmax(0, 1.15fr) minmax(11rem, 16rem) auto',
  maxWidth: '100%',
  minWidth: 0,
  padding: `${spacing[5]} ${spacing[8]}`,
  width: '100%',

  // Tablet: title + actions on one row, progress full width below — no overlap.
  '@media (max-width: 75rem)': {
    alignItems: 'start',
    gap: spacing[3],
    gridTemplateAreas: `
      "title actions"
      "progress progress"
    `,
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    padding: `${spacing[4]} ${spacing[5]}`,
    '& .title-cluster': { gridArea: 'title', minWidth: 0 },
    '& .progress-summary': { gridArea: 'progress', maxWidth: '100%', width: '100%' },
    '& .header-actions': { gridArea: 'actions', justifyContent: 'flex-end' },
    '& .page-subtitle': {
      display: '-webkit-box',
      overflow: 'hidden',
      WebkitBoxOrient: 'vertical',
      WebkitLineClamp: 2,
    },
  },

  '@media (max-width: 48rem)': {
    gap: spacing[3],
    gridTemplateAreas: `
      "title"
      "progress"
      "actions"
    `,
    gridTemplateColumns: '1fr',
    padding: `${spacing[3]} ${spacing[3]}`,
    '& .page-subtitle': { display: 'none' },
    '& .title-icon': { display: 'none' },
    '& .page-title': { fontSize: fontSize.xl },
    '& .header-actions': {
      gap: spacing[2],
      justifyContent: 'stretch',
      width: '100%',
      '& > button': {
        flex: '1 1 0',
        minWidth: 0,
      },
    },
  },

  '& .title-cluster': {
    alignItems: 'center',
    display: 'flex',
    gap: spacing[4],
    minWidth: 0,
    overflow: 'hidden',
  },
  '& .title-icon': {
    ...iconBox('3.25rem'),
    background: `linear-gradient(145deg, ${t.primarySoft}, ${t.background})`,
    border: '1px solid rgba(37, 99, 235, 0.22)',
    borderRadius: borderRadius['2xl'],
    boxShadow: t.purpleShadow,
    flex: '0 0 auto',
  },
  '& .title-copy': { display: 'grid', gap: spacing[1], minWidth: 0 },
  '& .page-title': {
    ...title,
    fontSize: fontSize['3xl'],
    lineHeight: 1.08,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  '& .page-subtitle': { ...muted, fontWeight: fontWeight.medium },
  '& .progress-summary': { display: 'grid', gap: spacing[2], minWidth: 0 },
  '& .progress-meta': {
    alignItems: 'center',
    color: t.text,
    display: 'flex',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    justifyContent: 'space-between',
  },
  '& .progress-value': { color: t.primary, fontWeight: fontWeight.extraBold },
  '& .header-actions': {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    flexWrap: 'wrap',
    gap: spacing[2],
    justifyContent: 'flex-end',
    minWidth: 0,
    rowGap: spacing[2],
  },
});

export const ProgressBar = styled(LinearProgress)({
  backgroundColor: '#ECEEF3',
  borderRadius: borderRadius.full,
  height: 8,
  width: '100%',
  '& .MuiLinearProgress-bar': {
    background: `linear-gradient(90deg, ${t.primary}, ${t.primaryHover})`,
    borderRadius: borderRadius.full,
  },
});

export const HeaderSecondaryButtonSx = {
  background: t.background,
  border,
  color: t.text,
  flexShrink: 0,
  minWidth: 0,
  px: 1.5,
  whiteSpace: 'nowrap',
};

export const HeaderPrimaryButtonSx = {
  flexShrink: 0,
  minWidth: 0,
  px: 1.5,
  whiteSpace: 'nowrap',
};
