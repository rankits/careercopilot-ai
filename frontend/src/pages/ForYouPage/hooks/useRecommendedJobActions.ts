import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import type { JobCardData } from '@/components/molecules';

import { useSaveJob, savedJobsQueryKey } from '@/features/applications/hooks/useSaveJob';

import { jobDetailPath } from '@/constants/routes';
import { applicationsService } from '@/features/applications/services/applications.service';
import { openExternalApply } from '@/features/jobs/utils/openExternalApply';
import type { RecommendationFeedbackAction } from '@/features/recommendations/types/recommendation.types';

import type { RecommendationMode } from '../utils';

type TrackFeedback = (
  recommendationId: string | undefined,
  action: RecommendationFeedbackAction,
) => void;

export function useRecommendedJobActions({
  activeMode,
  similarSourceJobId,
  trackRecommendationFeedback,
}: {
  activeMode: RecommendationMode;
  similarSourceJobId: string | undefined;
  trackRecommendationFeedback: TrackFeedback;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { saveJob, unsaveJob } = useSaveJob();
  const [optimisticSaved, setOptimisticSaved] = useState<Record<string, boolean>>({});

  const savedQuery = useQuery({
    queryKey: savedJobsQueryKey,
    queryFn: () => applicationsService.listSavedJobs(),
    enabled:
      activeMode === 'profile' ||
      activeMode === 'resume' ||
      activeMode === 'text-career' ||
      activeMode === 'career' ||
      activeMode === 'saved' ||
      (activeMode === 'similar' && Boolean(similarSourceJobId)),
  });

  const savedIdSet = useMemo(() => {
    const ids = new Set(
      (savedQuery.data ?? []).map((app) => app.jobId).filter((id): id is string => Boolean(id)),
    );
    for (const [jobId, isSaved] of Object.entries(optimisticSaved)) {
      if (isSaved) ids.add(jobId);
      else ids.delete(jobId);
    }
    return ids;
  }, [optimisticSaved, savedQuery.data]);

  const handleRecommendedApply = useCallback(
    (selected: JobCardData) => {
      const opened = openExternalApply(selected.applyUrl);
      if (opened) {
        trackRecommendationFeedback(selected.recommendationId, 'APPLIED');
      }
    },
    [trackRecommendationFeedback],
  );

  const handleRecommendedSave = useCallback(
    (selected: JobCardData) => {
      if (!selected.id) return;
      const jobId = selected.id;
      const wasSaved = savedIdSet.has(jobId);
      setOptimisticSaved((prev) => ({ ...prev, [jobId]: !wasSaved }));
      const saveRequest = wasSaved ? unsaveJob(jobId) : saveJob(jobId);
      void saveRequest
        .then(() => {
          if (!wasSaved) {
            trackRecommendationFeedback(selected.recommendationId, 'SAVED');
          }
        })
        .catch(() => {
          setOptimisticSaved((prev) => ({ ...prev, [jobId]: wasSaved }));
        });
    },
    [saveJob, savedIdSet, trackRecommendationFeedback, unsaveJob],
  );

  const handleRecommendedOpen = useCallback(
    (selected: JobCardData, recommendationId?: string) => {
      if (!selected.id) return;
      trackRecommendationFeedback(recommendationId ?? selected.recommendationId, 'OPENED');
      void navigate(jobDetailPath(selected.id), {
        state: { fromFeed: `${location.pathname}${location.search}` },
      });
    },
    [location.pathname, location.search, navigate, trackRecommendationFeedback],
  );

  return {
    savedIdSet,
    handleRecommendedApply,
    handleRecommendedSave,
    handleRecommendedOpen,
  };
}
