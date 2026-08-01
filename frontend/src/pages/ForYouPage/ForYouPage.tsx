import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';
import { JobCard, VirtualizedJobList } from '@/components/molecules';

import { useSaveJob, savedJobsQueryKey } from '@/features/applications/hooks/useSaveJob';
import {
  useGenerateRecommendations,
  useRecommendations,
} from '@/features/recommendations/hooks/useRecommendations';
import { useAppSelector } from '@/hooks/redux';

import { jobDetailPath, ROUTES } from '@/constants/routes';
import { applicationsService } from '@/features/applications/services/applications.service';
import { openExternalApply } from '@/features/jobs/utils/openExternalApply';
import { Box, CircularProgress, Typography } from '@/lib/material';

export function ForYouPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isProfileComplete = useAppSelector((state) => state.auth.isProfileComplete);
  const [page, setPage] = useState(1);
  const [generatedOnce, setGeneratedOnce] = useState(false);

  const { data, isPending, isError, error, refetch, isFetching } = useRecommendations({
    page,
    limit: 20,
  });
  const generate = useGenerateRecommendations();
  const { saveJob, unsaveJob } = useSaveJob();
  const savedQuery = useQuery({
    queryKey: savedJobsQueryKey,
    queryFn: () => applicationsService.listSavedJobs(),
  });
  const [optimisticSaved, setOptimisticSaved] = useState<Record<string, boolean>>({});

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

  const isEmpty = !isPending && !isError && (data?.items.length ?? 0) === 0;
  const generateError =
    generate.error instanceof Error
      ? generate.error.message
      : generate.isError
        ? 'Unable to generate recommendations.'
        : null;

  return (
    <Box component="section" sx={{ display: 'grid', gap: 3, py: 2 }}>
      <Box sx={{ display: 'grid', gap: 1 }}>
        <Typography component="h1" sx={{ fontWeight: 800, fontSize: '1.5rem', m: 0 }}>
          For You
        </Typography>
        <Typography sx={{ color: 'text.secondary' }}>
          Personalized matches from your profile. Generation is explicit — loading this page never
          starts a new run.
        </Typography>
      </Box>

      {isPending ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress aria-label="Loading recommendations" />
        </Box>
      ) : null}

      {isError ? (
        <Box role="alert" sx={{ display: 'grid', gap: 2, justifyItems: 'start' }}>
          <Typography>
            {error instanceof Error ? error.message : 'Unable to load recommendations.'}
          </Typography>
          <Button disabled={isFetching} onClick={() => void refetch()} size="small">
            Retry
          </Button>
        </Box>
      ) : null}

      {isEmpty && !isProfileComplete ? (
        <Box sx={{ display: 'grid', gap: 2, justifyItems: 'start', py: 4 }}>
          <Typography role="status">
            Complete your profile so we can score jobs against your skills and experience.
          </Typography>
          <Button component={RouterLink} size="small" to={ROUTES.PROFILE} variant="outline">
            Complete profile
          </Button>
        </Box>
      ) : null}

      {isEmpty && isProfileComplete ? (
        <Box sx={{ display: 'grid', gap: 2, justifyItems: 'start', py: 4 }}>
          <Typography role="status">
            {generatedOnce
              ? 'No matching jobs were found for your current profile. Try updating your skills or generate again later.'
              : 'No recommendations yet. Generate a personalized set from your profile when you are ready.'}
          </Typography>
          {generateError ? (
            <Typography role="alert" sx={{ color: 'error.main' }}>
              {generateError}
            </Typography>
          ) : null}
          <Button
            disabled={generate.isPending}
            isLoading={generate.isPending}
            onClick={() => {
              setGeneratedOnce(true);
              void generate.mutateAsync().catch(() => undefined);
            }}
            size="small"
          >
            Generate recommendations
          </Button>
          <Button component={RouterLink} size="small" to={ROUTES.JOB_FEED} variant="outline">
            Browse all jobs
          </Button>
        </Box>
      ) : null}

      {!isPending && !isError && (data?.cards.length ?? 0) > 0 ? (
        <>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography sx={{ color: 'text.secondary' }}>
              {data?.total ?? 0} recommendation{(data?.total ?? 0) === 1 ? '' : 's'}
            </Typography>
            <Button
              disabled={generate.isPending}
              isLoading={generate.isPending}
              onClick={() => {
                setGeneratedOnce(true);
                void generate.mutateAsync().catch(() => undefined);
              }}
              size="small"
              variant="outline"
            >
              Refresh matches
            </Button>
          </Box>
          {generateError ? (
            <Typography role="alert" sx={{ color: 'error.main' }}>
              {generateError}
            </Typography>
          ) : null}
          <VirtualizedJobList
            ariaLabel="For you recommendations"
            getKey={(job) => job.id ?? `${job.company}-${job.title}`}
            items={data?.cards ?? []}
            renderItem={(job) => (
              <JobCard
                job={job}
                isSaved={Boolean(job.id && savedIdSet.has(job.id))}
                onApply={(selected) => {
                  openExternalApply(selected.applyUrl);
                }}
                onOpen={(selected) => {
                  if (!selected.id) return;
                  void navigate(jobDetailPath(selected.id), {
                    state: { fromFeed: `${location.pathname}${location.search}` },
                  });
                }}
                onSave={(selected) => {
                  if (!selected.id) return;
                  const jobId = selected.id;
                  const wasSaved = savedIdSet.has(jobId);
                  setOptimisticSaved((prev) => ({ ...prev, [jobId]: !wasSaved }));
                  void (wasSaved ? unsaveJob(jobId) : saveJob(jobId)).catch(() => {
                    setOptimisticSaved((prev) => ({ ...prev, [jobId]: wasSaved }));
                  });
                }}
              />
            )}
          />
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', py: 2 }}>
            <Button
              disabled={!data?.hasPreviousPage || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              size="small"
              variant="outline"
            >
              Previous
            </Button>
            <Typography>
              Page {data?.page ?? page}
              {data?.totalPages ? ` of ${data.totalPages}` : ''}
            </Typography>
            <Button
              disabled={!data?.hasNextPage || isFetching}
              onClick={() => setPage((p) => p + 1)}
              size="small"
              variant="outline"
            >
              Next
            </Button>
          </Box>
        </>
      ) : null}
    </Box>
  );
}
