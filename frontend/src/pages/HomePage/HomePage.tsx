import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';
import { DashboardMetricCard } from '@/components/molecules';

import { useRecommendationReadiness } from '@/features/recommendations/hooks/useRecommendations';

import { dashboardMetrics } from '@/constants/pages/dashboard';
import { ROUTES } from '@/constants/routes';

import {
  DashboardMetricsGrid,
  DashboardPanel,
  DashboardRoot,
  DashboardTitle,
  RecommendationsEmptyState,
  RecommendationsEmptyText,
} from './styles';

export function HomePage() {
  const navigate = useNavigate();
  const readiness = useRecommendationReadiness();

  const openForYou = () => {
    void navigate(ROUTES.FOR_YOU);
  };

  const readinessHint = readiness.data?.canGenerateFromProfile
    ? 'Your profile is ready — generate matches on For You.'
    : readiness.data?.blockers.includes('PROFILE_INCOMPLETE')
      ? 'Complete your profile to unlock personalized recommendations.'
      : 'Open For You to check recommendation readiness from the backend.';

  return (
    <DashboardRoot aria-label="Dashboard page">
      <DashboardMetricsGrid>
        {dashboardMetrics.map(({ icon: Icon, ...metric }) => (
          <DashboardMetricCard icon={<Icon fontSize="large" />} key={metric.label} {...metric} />
        ))}
      </DashboardMetricsGrid>

      <DashboardPanel>
        <DashboardTitle>Recommended Jobs</DashboardTitle>
        <RecommendationsEmptyState>
          <RecommendationsEmptyText>{readinessHint}</RecommendationsEmptyText>
          <Button onClick={openForYou} variant="contained">
            Go to For You
          </Button>
        </RecommendationsEmptyState>
      </DashboardPanel>
    </DashboardRoot>
  );
}
