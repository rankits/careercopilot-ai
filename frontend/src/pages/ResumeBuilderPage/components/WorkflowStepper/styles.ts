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
  alignItems: 'stretch',
  background: colorTokens.backgroundCard,
  borderBottom: border,
  boxSizing: 'border-box',
  display: 'flex',
  flexWrap: 'nowrap',
  gap: 0,
  justifyContent: 'space-between',
  maxWidth: '100%',
  minHeight: '5.25rem',
  minWidth: 0,
  overflowX: 'hidden',
  padding: `${spacing[3]} ${spacing[5]}`,
  width: '100%',

  '@media (max-width: 75rem)': {
    paddingInline: spacing[4],
    '& .step-description': { display: 'none' },
    '& .step-connector': {
      flex: '0 1 1rem',
      marginInline: spacing[1],
      minWidth: '0.5rem',
    },
    '& .step-wrap': {
      flex: '1 1 0',
      maxWidth: 'none',
      minWidth: 0,
    },
  },

  '@media (max-width: 48rem)': {
    alignItems: 'center',
    gap: spacing[1],
    justifyContent: 'space-between',
    minHeight: '4.25rem',
    padding: `${spacing[3]} ${spacing[3]}`,
    '& .step-wrap': {
      flex: '1 1 0',
      gap: 0,
      justifyContent: 'center',
      maxWidth: '20%',
      minWidth: 0,
    },
    '& .step-connector': { display: 'none' },
    '& .step-description': { display: 'none' },
    '& .step-copy': {
      maxWidth: '100%',
      textAlign: 'center',
      width: '100%',
    },
    '& .step-label': {
      fontSize: '0.65rem',
      maxWidth: '100%',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
  },

  '& .step-wrap': {
    alignItems: 'center',
    display: 'flex',
    flex: '1 1 0',
    gap: spacing[2],
    maxWidth: 'min(14rem, 100%)',
    minWidth: 0,
    overflow: 'hidden',
  },
  '& .step-copy': { display: 'grid', gap: spacing[1], minWidth: 0 },
  '& .step-label': {
    ...title,
    fontSize: fontSize.xs,
    lineHeight: 1.2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  '& .step-description': {
    ...muted,
    fontSize: fontSize.xs,
    lineHeight: 1.45,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  '& .step-connector': {
    borderTop: '2px dashed #DCE1EA',
    flex: '0 1 2rem',
    height: 0,
    marginInline: spacing[2],
    minWidth: spacing[2],
  },
});

export const StepItem = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active' && prop !== 'completed',
})<{ active?: boolean; completed?: boolean }>(({ active = false, completed = false }) => ({
  alignItems: 'center',
  display: 'flex',
  flex: '1 1 auto',
  gap: spacing[2],
  maxWidth: '100%',
  minWidth: 0,
  opacity: active || completed ? 1 : 0.66,
  '@media (max-width: 48rem)': {
    flexDirection: 'column',
    gap: spacing[1],
    maxWidth: '100%',
    width: '100%',
  },
}));

export const StepDot = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active' && prop !== 'completed',
})<{ active?: boolean; completed?: boolean }>(({ active = false, completed = false }) => ({
  ...iconBox('2.4rem'),
  background: completed ? colorTokens.feedbackSuccess : active ? primaryGradient : '#F4F5F8',
  border: active ? '1px solid rgba(37, 99, 235, 0.22)' : '1px solid #ECEEF3',
  borderRadius: borderRadius.full,
  boxShadow: active ? t.purpleShadow : 'none',
  color: completed || active ? t.background : t.textMuted,
  flexShrink: 0,
  fontSize: '0.7rem',
  fontWeight: fontWeight.bold,
  '& svg': { fontSize: '1rem' },
  '@media (max-width: 48rem)': {
    height: '2rem',
    width: '2rem',
    '& svg': { fontSize: '0.9rem' },
  },
}));
