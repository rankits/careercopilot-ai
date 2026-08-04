import { Box, styled } from '@/lib/material';

import { border, borderRadius, fontSize, iconBox, spacing, t, title } from '../../styles/shared';

export const SupportCard = styled(Box)({
  background: `linear-gradient(145deg, ${t.background}, ${t.primarySofter})`,
  border,
  borderRadius: borderRadius['2xl'],
  boxShadow: '0 18px 48px rgba(37, 99, 235, 0.08)',
  display: 'grid',
  gap: spacing[4],
  padding: spacing[6],

  '& .support-header': { alignItems: 'center', display: 'flex', gap: spacing[3] },
  '& .support-icon': iconBox('2.75rem'),
  '& .support-title': { ...title, fontSize: fontSize.base, lineHeight: 1.35 },
  '& .support-list': { display: 'grid', gap: spacing[3] },
  '& .support-item': { alignItems: 'center', display: 'flex', gap: spacing[2] },
  '& .check-icon': { color: t.primary, fontSize: '1rem' },
  '& .support-text': { color: t.text, fontSize: fontSize.sm },
});
