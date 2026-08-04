import { Box, styled } from '@/lib/material';

import {
  border,
  borderRadius,
  colorTokens,
  fontSize,
  fontWeight,
  iconBox,
  muted,
  primaryGradient,
  spacing,
  t,
  title,
} from '../../styles/shared';

export const Stepper = styled(Box)({
  alignItems: 'center',
  borderBottom: border,
  display: 'flex',
  minHeight: '5.25rem',
  overflowX: 'auto',
  padding: `${spacing[4]} ${spacing[8]}`,
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': { display: 'none' },
  '@media (max-width: 56rem)': { paddingInline: spacing[5] },
  '@media (max-width: 40rem)': {
    minHeight: '4.5rem',
    padding: `${spacing[3]} ${spacing[3]}`,
    '& .step-description': { display: 'none' },
    '& .step-connector': { flexBasis: '1.5rem', minWidth: spacing[4], marginInline: spacing[2] },
  },

  '& .step-wrap': { alignItems: 'center', display: 'flex', gap: spacing[3], minWidth: 0 },
  '& .step-copy': { display: 'grid', gap: spacing[1], minWidth: 0 },
  '& .step-label': { ...title, fontSize: fontSize.xs, lineHeight: 1.2, whiteSpace: 'nowrap' },
  '& .step-description': {
    ...muted,
    fontSize: fontSize.xs,
    lineHeight: 1.45,
    whiteSpace: 'nowrap',
  },
  '& .step-connector': {
    borderTop: '2px dashed #DCE1EA',
    flex: '1 0 4rem',
    height: 0,
    marginInline: spacing[4],
    minWidth: spacing[8],
  },
});

export const StepItem = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active' && prop !== 'completed',
})<{ active?: boolean; completed?: boolean }>(({ active = false, completed = false }) => ({
  alignItems: 'center',
  display: 'flex',
  flex: '0 0 11rem',
  gap: spacing[3],
  minWidth: 0,
  opacity: active || completed ? 1 : 0.66,
  '@media (max-width: 40rem)': {
    flex: '0 0 auto',
  },
}));

export const StepDot = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active' && prop !== 'completed',
})<{ active?: boolean; completed?: boolean }>(({ active = false, completed = false }) => ({
  ...iconBox('2.4rem'),
  background: completed ? colorTokens.feedbackSuccess : active ? primaryGradient : '#F4F5F8',
  border: active ? '1px solid rgba(124,58,237,0.22)' : '1px solid #ECEEF3',
  borderRadius: borderRadius.full,
  boxShadow: active ? t.purpleShadow : 'none',
  color: completed || active ? t.background : t.textMuted,
  fontSize: '0.7rem',
  fontWeight: fontWeight.bold,
  '& svg': { fontSize: '1rem' },
}));
