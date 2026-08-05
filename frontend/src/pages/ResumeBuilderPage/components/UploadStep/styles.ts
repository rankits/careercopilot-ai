import { Box, styled } from '@/lib/material';

import { spacing } from '../../styles/shared';

export const UploadLayout = styled(Box)({
  display: 'grid',
  gap: spacing[4],
  minWidth: 0,
  overflowX: 'hidden',
  padding: `${spacing[6]} ${spacing[8]} ${spacing[8]}`,
  width: '100%',
  '@media (max-width: 48rem)': {
    gap: spacing[3],
    padding: `${spacing[3]} ${spacing[3]} ${spacing[5]}`,
  },

  '& .upload-content': { display: 'grid', gap: spacing[4], minWidth: 0 },
});

export const MainGrid = styled(Box)({
  display: 'grid',
  gap: spacing[4],
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 22rem)',
  minWidth: 0,
  '@media (max-width: 72rem)': { gridTemplateColumns: '1fr' },
});
