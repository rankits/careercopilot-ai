import { useNavigate } from 'react-router-dom';

import { Input } from '@/components/atoms/Input';
import {
  DashboardJobRow,
  DashboardMetricCard,
  FilterDropdown,
  ResumeScoreCard,
} from '@/components/molecules';

import {
  bestJobMatch,
  dashboardFilters,
  dashboardFilterOptions,
  dashboardMetrics,
  recommendedJobs,
} from '@/constants/pages/dashboard';
import { ROUTES } from '@/constants/routes';
import { SearchOutlinedIcon } from '@/lib/material';

import {
  BestMatchPanel,
  DashboardFilterGrid,
  DashboardHeader,
  DashboardMetricsGrid,
  DashboardPanel,
  DashboardRoot,
  DashboardTitle,
  DashboardTopGrid,
  RecommendationList,
  ViewAllButton,
} from './styles';

export function HomePage() {
  const navigate = useNavigate();
  const showJobFeed = () => {
    void navigate(ROUTES.JOB_FEED);
  };
  const renderJobRow = (job: (typeof recommendedJobs)[number]) => (
    <DashboardJobRow job={job} key={`${job.company}-${job.title}`} />
  );

  return (
    <DashboardRoot aria-label="Dashboard page">
      <DashboardTopGrid>
        <ResumeScoreCard score={92} />

        <BestMatchPanel>
          <DashboardTitle>Best Job Match</DashboardTitle>
          <DashboardJobRow featured job={bestJobMatch} />
        </BestMatchPanel>
      </DashboardTopGrid>

      <DashboardMetricsGrid>
        {dashboardMetrics.map(({ icon: Icon, ...metric }) => (
          <DashboardMetricCard icon={<Icon fontSize="large" />} key={metric.label} {...metric} />
        ))}
      </DashboardMetricsGrid>

      <DashboardPanel>
        <DashboardHeader>
          <DashboardTitle>Recommended Jobs</DashboardTitle>
          <ViewAllButton onClick={showJobFeed}>View All</ViewAllButton>
        </DashboardHeader>

        <DashboardFilterGrid>
          <Input
            aria-label="Search recommended jobs"
            placeholder="Search by title, company or skills..."
            size="small"
            startAdornment={<SearchOutlinedIcon fontSize="small" />}
          />
          {dashboardFilters.map((filter) => (
            <FilterDropdown
              onChange={() => {}}
              fullWidth
              key={filter.key}
              label={filter.label}
              options={dashboardFilterOptions[filter.key]}
              value={filter.value}
            />
          ))}
        </DashboardFilterGrid>

        <RecommendationList>{recommendedJobs.map(renderJobRow)}</RecommendationList>
      </DashboardPanel>
    </DashboardRoot>
  );
}
