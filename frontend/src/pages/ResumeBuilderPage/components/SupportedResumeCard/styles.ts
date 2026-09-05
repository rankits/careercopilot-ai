import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';

import { fontSize, iconBox, panel, spacing, t, title } from '../../styles/shared';

export const SupportCard = styled(Box)({
  ...panel,
  alignContent: 'start',
  background: `linear-gradient(145deg, ${t.background}, ${t.primarySofter})`,
  gap: spacing[4],
  height: '100%',

  '& .support-header': { alignItems: 'center', display: 'flex', gap: spacing[3] },
  '& .support-icon': iconBox('2.75rem'),
  '& .support-title': { ...title, fontSize: fontSize.base, lineHeight: 1.35 },
  '& .support-list': { display: 'grid', gap: spacing[3] },
  '& .support-item': { alignItems: 'center', display: 'flex', gap: spacing[2] },
  '& .check-icon': { color: t.primary, fontSize: '1rem' },
  '& .support-text': { color: t.text, fontSize: fontSize.sm },
});
