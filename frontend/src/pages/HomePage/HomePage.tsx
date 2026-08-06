import { useLocation, useNavigate } from 'react-router-dom';

import type { JobCardData } from '@/components/molecules';

import { jobDetailPath } from '@/constants/routes';
import type { SavedJobCardModel } from '@/features/applications/utils/mapApplicationDtoToSavedJobCard';
import {
  AutoAwesomeOutlinedIcon,
  BookmarkOutlinedIcon,
  BusinessCenterOutlinedIcon,
  SendOutlinedIcon,
} from '@/lib/material';

import { ApplicationPipelineCard } from './components/ApplicationPipelineCard';
import { DashboardStatCard } from './components/DashboardStatCard';
import { ExploreJobsCta } from './components/ExploreJobsCta';
import { RecentlySavedSection } from './components/RecentlySavedSection';
import { RecommendedJobsSection } from './components/RecommendedJobsSection';
import { ResumeOverviewCard } from './components/ResumeOverviewCard';
import { WelcomeHeader } from './components/WelcomeHeader';
import { useDashboardOverview } from './hooks/useDashboardOverview';
import { BottomGrid, DashboardError, DashboardRoot, MidGrid, StatsGrid } from './styles';

const STAT_ICONS = {
  'jobs-matched': BusinessCenterOutlinedIcon,
  'saved-jobs': BookmarkOutlinedIcon,
  applications: SendOutlinedIcon,
  'ai-match': AutoAwesomeOutlinedIcon,
} as const;

export function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dashboard = useDashboardOverview();

  const openJob = (job: Pick<JobCardData, 'id'>) => {
    if (!job.id) return;
    void navigate(jobDetailPath(job.id), {
      state: { fromFeed: `${location.pathname}${location.search}` },
    });
  };

  const openSavedJob = (job: SavedJobCardModel) => {
    openJob(job);
  };

  return (
    <DashboardRoot aria-label="Dashboard page">
      <WelcomeHeader greeting={dashboard.greeting} />

      {dashboard.errorMessage ? (
        <DashboardError role="alert">{dashboard.errorMessage}</DashboardError>
      ) : null}

      <StatsGrid>
        {dashboard.stats.map((stat) => {
          const Icon = STAT_ICONS[stat.id as keyof typeof STAT_ICONS] ?? BusinessCenterOutlinedIcon;
          return (
            <DashboardStatCard
              helper={stat.helper}
              helperTone={stat.helperTone}
              icon={<Icon fontSize="small" />}
              key={stat.id}
              label={stat.label}
              loading={dashboard.isStatsLoading}
              sparkline={stat.sparkline}
              tone={stat.tone}
              value={stat.value}
            />
          );
        })}
      </StatsGrid>

      <MidGrid>
        <ApplicationPipelineCard
          loading={dashboard.isPipelineLoading}
          stages={dashboard.pipeline}
        />
        <ResumeOverviewCard
          checks={dashboard.resumeChecks}
          loading={dashboard.isResumeLoading}
          score={dashboard.resumeScore}
          scoreLabel={dashboard.resumeScoreLabel}
        />
      </MidGrid>

      <BottomGrid>
        <RecommendedJobsSection
          jobs={dashboard.recommendedJobs}
          loading={dashboard.isRecommendedLoading}
          onOpenJob={openJob}
        />
        <RecentlySavedSection
          jobs={dashboard.recentlySaved}
          loading={dashboard.isSavedLoading}
          onOpenJob={openSavedJob}
        />
      </BottomGrid>

      <ExploreJobsCta />
    </DashboardRoot>
  );
}
