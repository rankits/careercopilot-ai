import { Box, Typography, styled } from '@/lib/material';

import {
  borderRadius,
  colorTokens,
  fontSize,
  fontWeight,
  iconBox,
  muted,
  panel,
  spacing,
  t,
  title,
} from '../../styles/shared';

export { CardTitle, CardSubtitle } from '../../styles/shared';

export const UploadCard = styled(Box)({
  ...panel,
  gap: spacing[4],
  padding: spacing[6],
});

export const DropZone = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'dragging',
})<{ dragging?: boolean }>(({ dragging = false }) => ({
  alignItems: 'center',
  background: `linear-gradient(135deg, ${dragging ? t.primarySoft : t.primarySofter}, ${t.background})`,
  border: `1.5px dashed ${dragging ? t.primary : `color-mix(in srgb, ${t.primary} 28%, transparent)`}`,
  borderRadius: borderRadius['2xl'],
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
  cursor: 'pointer',
  display: 'flex',
  gap: spacing[3],
  minHeight: '7.25rem',
  padding: `${spacing[4]} ${spacing[5]}`,
  textAlign: 'left',
  transition: 'border-color 150ms ease, background 150ms ease, box-shadow 150ms ease',
  '&:hover': {
    background: `linear-gradient(135deg, ${t.primarySoft}, ${t.background})`,
    borderColor: t.primary,
    boxShadow: '0 16px 38px rgba(37, 99, 235, 0.1)',
  },
  '@media (max-width: 40rem)': { alignItems: 'flex-start', flexDirection: 'column' },

  '& .upload-icon-box': {
    ...iconBox('4.25rem'),
    background: `linear-gradient(145deg, ${t.background}, ${t.primarySoft})`,
    border: '1px solid rgba(37, 99, 235, 0.14)',
    borderRadius: borderRadius['2xl'],
    flex: '0 0 auto',
  },
  '& .upload-icon': { fontSize: '2.25rem' },
  '& .upload-copy': { display: 'grid', gap: spacing[2], minWidth: 0 },
  '& .upload-title': { ...title, fontSize: fontSize.base },
  '& .upload-subtitle': muted,
  '& .browse-button': {
    alignItems: 'center',
    background: t.background,
    border: '1px solid rgba(37, 99, 235, 0.36)',
    borderRadius: borderRadius.xl,
    color: t.primaryHover,
    cursor: 'pointer',
    display: 'inline-flex',
    fontFamily: 'inherit',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    gap: spacing[2],
    marginLeft: 'auto',
    padding: `${spacing[2]} ${spacing[4]}`,
    '@media (max-width: 40rem)': { justifyContent: 'center', marginLeft: 0, width: '100%' },
  },
}));

export const ErrorText = styled(Typography)({
  color: colorTokens.feedbackError,
  fontSize: fontSize.sm,
});
