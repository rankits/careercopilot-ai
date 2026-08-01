import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';
import { DashboardMetricCard, ResumeScoreCard } from '@/components/molecules';

import { dashboardMetrics } from '@/constants/pages/dashboard';
import { ROUTES } from '@/constants/routes';

import {
  DashboardMetricsGrid,
  DashboardPanel,
  DashboardRoot,
  DashboardTitle,
  DashboardTopGrid,
  RecommendationsEmptyState,
  RecommendationsEmptyText,
} from './styles';

export function HomePage() {
  const navigate = useNavigate();

  const openForYou = () => {
    void navigate(ROUTES.FOR_YOU);
  };

  return (
    <DashboardRoot aria-label="Dashboard page">
      <DashboardTopGrid>
        <ResumeScoreCard score={92} />
      </DashboardTopGrid>

      <DashboardMetricsGrid>
        {dashboardMetrics.map(({ icon: Icon, ...metric }) => (
          <DashboardMetricCard icon={<Icon fontSize="large" />} key={metric.label} {...metric} />
        ))}
      </DashboardMetricsGrid>

      <DashboardPanel>
        <DashboardTitle>Recommended Jobs</DashboardTitle>
        <RecommendationsEmptyState>
          <RecommendationsEmptyText>
            Personalized matches are generated on the For You page from your profile — not shown
            here with sample data.
          </RecommendationsEmptyText>
          <Button onClick={openForYou} variant="contained">
            Go to For You
          </Button>
        </RecommendationsEmptyState>
      </DashboardPanel>
    </DashboardRoot>
  );
}
