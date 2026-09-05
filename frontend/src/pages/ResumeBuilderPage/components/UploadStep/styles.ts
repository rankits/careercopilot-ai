import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';

import { spacing, stepPadding } from '../../styles/shared';

export const UploadLayout = styled(Box)({
  display: 'grid',
  gap: spacing[4],
  minWidth: 0,
  overflowX: 'hidden',
  width: '100%',
  ...stepPadding,

  '& .upload-content': { display: 'grid', gap: spacing[4], minWidth: 0 },
});

export const MainGrid = styled(Box)({
  alignItems: 'stretch',
  display: 'grid',
  gap: spacing[4],
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
  minWidth: 0,
  '@media (max-width: 72rem)': { gridTemplateColumns: '1fr' },
  '& > *': { height: '100%', minWidth: 0 },
});
