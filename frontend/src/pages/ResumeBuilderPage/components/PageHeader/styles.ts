import { Box, LinearProgress, styled } from '@/lib/material';

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
  borderBottom: border,
  display: 'grid',
  gap: spacing[5],
  gridTemplateColumns: 'minmax(0, 1fr) minmax(14rem, 22rem) auto',
  minHeight: '7rem',
  padding: `${spacing[5]} ${spacing[8]}`,
  '@media (max-width: 64rem)': { gridTemplateColumns: '1fr' },
  '@media (max-width: 48rem)': {
    gap: spacing[3],
    padding: `${spacing[4]} ${spacing[3]}`,
  },

  '& .title-cluster': {
    alignItems: 'center',
    display: 'flex',
    gap: spacing[4],
    minWidth: 0,
  },
  '& .title-icon': {
    ...iconBox('3.25rem'),
    background: `linear-gradient(145deg, ${t.primarySoft}, ${t.background})`,
    border: '1px solid rgba(124,58,237,0.22)',
    borderRadius: borderRadius['2xl'],
    boxShadow: t.purpleShadow,
    flex: '0 0 auto',
  },
  '& .title-copy': { display: 'grid', gap: spacing[2], minWidth: 0 },
  '& .page-title': { ...title, fontSize: fontSize['3xl'], lineHeight: 1.08 },
  '& .page-subtitle': { ...muted, fontWeight: fontWeight.medium },
  '& .progress-summary': { display: 'grid', gap: spacing[2] },
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
    gap: spacing[3],
    justifyContent: 'flex-end',
    '@media (max-width: 40rem)': {
      justifyContent: 'stretch',
      '& > button': { flex: 1 },
    },
  },
});

export const ProgressBar = styled(LinearProgress)({
  backgroundColor: '#ECEEF3',
  borderRadius: borderRadius.full,
  height: 8,
  '& .MuiLinearProgress-bar': {
    background: `linear-gradient(90deg, ${t.primary}, ${t.primaryHover})`,
    borderRadius: borderRadius.full,
  },
});

export const HeaderSecondaryButtonSx = {
  background: t.background,
  border,
  color: t.text,
  minWidth: '8.5rem',
};

export const HeaderPrimaryButtonSx = { minWidth: '7rem' };
