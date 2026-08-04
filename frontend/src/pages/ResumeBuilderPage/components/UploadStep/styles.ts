import { Box, styled } from '@/lib/material';

import { spacing } from '../../styles/shared';

export const UploadLayout = styled(Box)({
  display: 'grid',
  gap: spacing[4],
  padding: `${spacing[6]} ${spacing[8]} ${spacing[8]}`,

  '& .upload-content': { display: 'grid', gap: spacing[4] },
});

export const MainGrid = styled(Box)({
  display: 'grid',
  gap: spacing[4],
  gridTemplateColumns: 'minmax(0, 1fr) 22rem',
  '@media (max-width: 72rem)': { gridTemplateColumns: '1fr' },
});
