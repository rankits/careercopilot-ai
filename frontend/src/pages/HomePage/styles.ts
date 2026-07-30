import { Box, MuiButton, styled } from '@/lib/material';
import { borderRadius, colorTokens, fontSize, fontWeight, shadows, spacing } from '@/tokens';

export const DashboardRoot = styled('section')({
  display: 'grid',
  gap: spacing[4],
});

export const DashboardTopGrid = styled(Box)({
  display: 'grid',
  gap: spacing[5],
  gridTemplateColumns: 'minmax(0, 0.82fr) minmax(26rem, 1.18fr)',

  '@media (max-width: 80rem)': {
    gridTemplateColumns: '1fr',
  },
});

export const DashboardPanel = styled(Box)({
  background: colorTokens.backgroundCard,
  border: `0.0625rem solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius.xl,
  boxShadow: shadows.card,
  minWidth: 0,
  padding: spacing[3],
});

export const BestMatchPanel = styled(DashboardPanel)({
  alignContent: 'center',
  background: 'linear-gradient(180deg, #ffffff 0%, #f8faff 100%)',
  display: 'grid',
  paddingBottom: 'calc(0.75rem + 0.25rem)',
});

export const DashboardHeader = styled(Box)({
  alignItems: 'center',
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: spacing[3],
});

export const DashboardTitle = styled('h2')({
  color: colorTokens.textPrimary,
  fontSize: fontSize.lg,
  fontWeight: fontWeight.bold,
  lineHeight: 1.2,
  margin: 0,
});

export const ViewAllButton = styled(MuiButton)({
  color: colorTokens.actionPrimary,
  cursor: 'pointer',
  fontSize: fontSize.sm,
  fontWeight: fontWeight.bold,
  textTransform: 'none',
});

export const DashboardFilterGrid = styled(Box)({
  alignItems: 'center',
  display: 'grid',
  gap: spacing[3],
  gridTemplateColumns: 'minmax(16rem, 1fr) repeat(5, minmax(8rem, 0.45fr))',
  marginBottom: spacing[2],

  '@media (max-width: 82rem)': {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },

  '@media (max-width: 48rem)': {
    gridTemplateColumns: '1fr',
  },
});

export const DashboardMetricsGrid = styled(Box)({
  display: 'grid',
  gap: spacing[4],
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  marginTop: spacing[4],

  '@media (max-width: 1180px)': {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },

  '@media (max-width: 640px)': {
    gridTemplateColumns: '1fr',
  },
});

export const RecommendationList = styled(Box)({
  display: 'grid',
  gap: spacing[2],
});
