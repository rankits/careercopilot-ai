import { useQuery } from '@tanstack/react-query';

import { savedJobsQueryKey } from '@/features/applications/hooks/useSaveJob';
import { useJobFeed } from '@/features/jobs/hooks/useJobFeed';
import { useRecommendations } from '@/features/recommendations/hooks/useRecommendations';
import { useAppSelector } from '@/hooks/redux';

import {
  DASHBOARD_LIMITS,
  DASHBOARD_PIPELINE_STAGES,
  DASHBOARD_STAT_LABELS,
} from '@/constants/pages/dashboard';
import { applicationsService } from '@/features/applications/services/applications.service';
import { APPLICATION_MANAGEMENT_STATUSES } from '@/features/applications/utils/applicationListQuery';
import { mapApplicationDtoToSavedJobCard } from '@/features/applications/utils/mapApplicationDtoToSavedJobCard';
import { hasAuthSession } from '@/features/auth/utils/authSession';
import { resumeService } from '@/features/resume/services/resume.service';
import { resumeBuilderService } from '@/services/resumeBuilder.service';
import type { IconTone } from '@/tokens';

import {
  average,
  buildWeeklySparkline,
  countCreatedThisWeek,
  formatCount,
  formatMatchScore,
  formatWeeklyDelta,
  getTimeGreeting,
  resolveDashboardFirstName,
  resumeScoreLabel,
} from '../utils/dashboardMetrics';

export interface DashboardStatModel {
  helper: string;
  helperTone: 'positive' | 'muted';
  id: string;
  label: string;
  sparkline: number[];
  tone: IconTone;
  value: string;
}

export interface DashboardPipelineStageModel {
  count: number;
  id: string;
  label: string;
}

export interface DashboardResumeCheckModel {
  complete: boolean;
  id: string;
  label: string;
}

function profileHasProjects(
  profile: {
    certifications?: Record<string, unknown>[];
    experience?: Record<string, unknown>[];
  } | null,
): boolean {
  if (!profile) return false;
  if ((profile.certifications?.length ?? 0) > 0) return true;
  return (profile.experience ?? []).some((entry) => {
    const blob = JSON.stringify(entry).toLowerCase();
    return blob.includes('project');
  });
}

export function useDashboardOverview() {
  const user = useAppSelector((state) => state.auth.user);
  const authed = hasAuthSession();

  const jobsQuery = useJobFeed({ limit: DASHBOARD_LIMITS.recommendedJobs });
  const recommendationsQuery = useRecommendations({ limit: 10, page: 1 }, { enabled: authed });

  const savedQuery = useQuery({
    enabled: authed,
    queryFn: () => applicationsService.listSavedJobs(),
    queryKey: savedJobsQueryKey,
    staleTime: 30_000,
  });

  const applicationsQuery = useQuery({
    enabled: authed,
    queryFn: () =>
      applicationsService.list({
        archived: 'false',
        limit: DASHBOARD_LIMITS.applicationsFetch,
        page: 1,
        sortBy: 'updatedAt:desc',
        status: APPLICATION_MANAGEMENT_STATUSES,
      }),
    queryKey: ['applications', 'dashboard', 'pipeline'],
    staleTime: 30_000,
  });

  const resumeVersionsQuery = useQuery({
    enabled: authed,
    queryFn: () => resumeBuilderService.listSavedVersions(),
    queryKey: ['resume-builder', 'saved-versions', 'dashboard'],
    staleTime: 60_000,
  });

  const profileQuery = useQuery({
    enabled: authed,
    queryFn: () => resumeService.getMyProfile(),
    queryKey: ['resumes', 'profile', 'me', 'dashboard'],
    staleTime: 60_000,
  });

  const applicationItems = applicationsQuery.data?.items ?? [];
  const savedItems = savedQuery.data ?? [];
  const recommendationCards = recommendationsQuery.data?.cards ?? [];
  const matchScores = recommendationCards
    .map((card) => card.match)
    .filter((score): score is number => typeof score === 'number');

  const openJobs = jobsQuery.data?.totalItems ?? 0;
  const savedCount = savedItems.length;
  const applicationsCount =
    applicationsQuery.data?.pagination.totalItems ?? applicationItems.length;
  const avgMatch = average(matchScores);
  const matchedJobsCount = recommendationCards.length;

  const savedDelta = countCreatedThisWeek(savedItems.map((item) => item.createdAt));
  const applicationsDelta = countCreatedThisWeek(applicationItems.map((item) => item.createdAt));
  const applicationSparkline = buildWeeklySparkline(applicationItems.map((item) => item.createdAt));
  const savedSparkline = buildWeeklySparkline(savedItems.map((item) => item.createdAt));
  const matchSparkline =
    matchScores.length > 0
      ? matchScores.slice(0, DASHBOARD_LIMITS.sparklinePoints)
      : Array.from({ length: DASHBOARD_LIMITS.sparklinePoints }, () => 0);

  const stats: DashboardStatModel[] = [
    {
      helper:
        matchedJobsCount > 0 ? `${formatCount(matchedJobsCount)} AI matched` : 'From your job feed',
      helperTone: matchedJobsCount > 0 ? 'positive' : 'muted',
      id: 'jobs-matched',
      label: DASHBOARD_STAT_LABELS.jobsMatched,
      sparkline: matchSparkline,
      tone: 'primary',
      value: formatCount(openJobs),
    },
    {
      helper: formatWeeklyDelta(savedDelta),
      helperTone: savedDelta > 0 ? 'positive' : 'muted',
      id: 'saved-jobs',
      label: DASHBOARD_STAT_LABELS.savedJobs,
      sparkline: savedSparkline,
      tone: 'primary',
      value: formatCount(savedCount),
    },
    {
      helper: formatWeeklyDelta(applicationsDelta),
      helperTone: applicationsDelta > 0 ? 'positive' : 'muted',
      id: 'applications',
      label: DASHBOARD_STAT_LABELS.applications,
      sparkline: applicationSparkline,
      tone: 'success',
      value: formatCount(applicationsCount),
    },
    {
      helper:
        avgMatch === null
          ? 'Generate matches on AI Match'
          : `Avg of ${formatCount(matchScores.length)} match${matchScores.length === 1 ? '' : 'es'}`,
      helperTone: avgMatch === null ? 'muted' : 'positive',
      id: 'ai-match',
      label: DASHBOARD_STAT_LABELS.matchScore,
      sparkline: matchSparkline,
      tone: 'warning',
      value: formatMatchScore(avgMatch),
    },
  ];

  const pipeline: DashboardPipelineStageModel[] = DASHBOARD_PIPELINE_STAGES.map((stage) => ({
    count: applicationItems.filter((item) =>
      (stage.statuses as readonly string[]).includes(item.currentStatus),
    ).length,
    id: stage.id,
    label: stage.label,
  }));

  const resumeScore = (() => {
    const versions = resumeVersionsQuery.data ?? [];
    if (versions.length === 0) return null;
    return Math.max(...versions.map((version) => Number(version.atsScore) || 0));
  })();

  const profile = profileQuery.data;
  const resumeChecks: DashboardResumeCheckModel[] = [
    {
      complete: (profile?.skills?.length ?? 0) > 0,
      id: 'skills',
      label: 'Skills',
    },
    {
      complete: profileHasProjects(profile ?? null),
      id: 'projects',
      label: 'Projects',
    },
    {
      complete: (profile?.experience?.length ?? 0) > 0,
      id: 'experience',
      label: 'Experience',
    },
    {
      complete: resumeScore !== null && resumeScore >= 70,
      id: 'ats',
      label: 'ATS Friendly',
    },
  ];

  const feedCards = jobsQuery.data?.cards ?? [];
  const recommendedJobs =
    recommendationCards.length > 0
      ? recommendationCards.slice(0, DASHBOARD_LIMITS.recommendedJobs)
      : feedCards.slice(0, DASHBOARD_LIMITS.recommendedJobs);
  const recentlySaved = [...savedItems]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, DASHBOARD_LIMITS.recentlySaved)
    .map((item, index) => mapApplicationDtoToSavedJobCard(item, index));

  const isRecommendedLoading =
    recommendationsQuery.isPending || (recommendationCards.length === 0 && jobsQuery.isPending);

  return {
    applicationsCount,
    errorMessage:
      (jobsQuery.error instanceof Error && jobsQuery.error.message) ||
      (savedQuery.error instanceof Error && savedQuery.error.message) ||
      (applicationsQuery.error instanceof Error && applicationsQuery.error.message) ||
      (recommendationsQuery.error instanceof Error && recommendationsQuery.error.message) ||
      null,
    greeting: `${getTimeGreeting()}, ${resolveDashboardFirstName(user)}`,
    isPipelineLoading: applicationsQuery.isPending,
    isRecommendedLoading,
    isResumeLoading: resumeVersionsQuery.isPending || profileQuery.isPending,
    isSavedLoading: savedQuery.isPending,
    isStatsLoading:
      jobsQuery.isPending ||
      savedQuery.isPending ||
      applicationsQuery.isPending ||
      recommendationsQuery.isPending,
    jobsMatched: openJobs,
    pipeline,
    recommendedJobs,
    recentlySaved,
    resumeChecks,
    resumeScore,
    resumeScoreLabel: resumeScore === null ? null : resumeScoreLabel(resumeScore),
    stats,
  };
}
