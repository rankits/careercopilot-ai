import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  Link as RouterLink,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import { Button } from '@/components/atoms/Button';
import { JobCard, VirtualizedJobList } from '@/components/molecules';

import { useSaveJob, savedJobsQueryKey } from '@/features/applications/hooks/useSaveJob';
import {
  useGenerateRecommendations,
  useGenerateResumeRecommendations,
  mapRecommendationDtoToCard,
  useRecommendationFeedback,
  useRecommendationReadiness,
  useRecommendations,
  useSimilarJobs,
} from '@/features/recommendations/hooks/useRecommendations';
import { useAppSelector } from '@/hooks/redux';

import { jobDetailPath, ROUTES } from '@/constants/routes';
import { applicationsService } from '@/features/applications/services/applications.service';
import { openExternalApply } from '@/features/jobs/utils/openExternalApply';
import { resumeService } from '@/features/resume/services/resume.service';
import { Alert, Box, CircularProgress, MenuItem, TextField, Typography } from '@/lib/material';

type RecommendationMode = 'profile' | 'resume' | 'similar' | 'text-career' | 'saved';

const recommendationModes: Array<{
  id: RecommendationMode;
  label: string;
  panelLabel: string;
  available: boolean;
}> = [
  { id: 'profile', label: 'Profile', panelLabel: 'Profile recommendations', available: true },
  { id: 'resume', label: 'Resume', panelLabel: 'Resume recommendations', available: true },
  { id: 'similar', label: 'Similar', panelLabel: 'Similar jobs', available: true },
  { id: 'text-career', label: 'Text / Career', panelLabel: 'Text and career matches', available: false },
  { id: 'saved', label: 'Saved', panelLabel: 'Saved search recommendations', available: false },
];

const recommendationModeIds = new Set(recommendationModes.map((mode) => mode.id));

const getModeFromSearchParams = (searchParams: URLSearchParams): RecommendationMode => {
  const requestedMode = searchParams.get('mode');

  return requestedMode && recommendationModeIds.has(requestedMode as RecommendationMode)
    ? (requestedMode as RecommendationMode)
    : 'profile';
};

const getTabId = (mode: RecommendationMode) => `for-you-${mode}-tab`;
const getPanelId = (mode: RecommendationMode) => `for-you-${mode}-panel`;

export function ForYouPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeMode = getModeFromSearchParams(searchParams);
  const similarSourceJobId = searchParams.get('jobId') || undefined;
  const activeModeMeta =
    recommendationModes.find((mode) => mode.id === activeMode) ?? recommendationModes[0];
  const isProfileComplete = useAppSelector((state) => state.auth.isProfileComplete);
  const [page, setPage] = useState(1);
  const [generatedOnce, setGeneratedOnce] = useState(false);
  const [resumeGeneratedOnce, setResumeGeneratedOnce] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [dismissedIds, setDismissedIds] = useState<Record<string, boolean>>({});
  const [resumeRecommendations, setResumeRecommendations] = useState<
    ReturnType<typeof mapRecommendationDtoToCard>[]
  >([]);

  const readiness = useRecommendationReadiness();
  const { data, isPending, isError, error, refetch, isFetching } = useRecommendations(
    {
      page,
      limit: 20,
      latestOnly: true,
    },
    {
      enabled: activeMode === 'profile',
    },
  );
  const generate = useGenerateRecommendations();
  const generateResume = useGenerateResumeRecommendations();
  const feedback = useRecommendationFeedback();
  const { saveJob, unsaveJob } = useSaveJob();
  const resumeProfile = useQuery({
    queryKey: ['resume', 'profile', 'me'],
    queryFn: () => resumeService.getMyProfile(),
    enabled: activeMode === 'resume',
  });
  const savedQuery = useQuery({
    queryKey: savedJobsQueryKey,
    queryFn: () => applicationsService.listSavedJobs(),
    enabled:
      activeMode === 'profile' ||
      activeMode === 'resume' ||
      (activeMode === 'similar' && Boolean(similarSourceJobId)),
  });
  const similarJobs = useSimilarJobs(similarSourceJobId, {
    enabled: activeMode === 'similar' && Boolean(similarSourceJobId),
    limit: 20,
  });
  const [optimisticSaved, setOptimisticSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const sourceResumeId = resumeProfile.data?.sourceResumeId;
    if (sourceResumeId && !selectedResumeId) {
      setSelectedResumeId(sourceResumeId);
    }
  }, [resumeProfile.data?.sourceResumeId, selectedResumeId]);

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

  const visibleCards = (data?.cards ?? []).filter(
    (card) => !card.recommendationId || !dismissedIds[card.recommendationId],
  );

  const profileBlocker = readiness.data?.blockers.includes('PROFILE_INCOMPLETE')
    ? 'PROFILE_INCOMPLETE'
    : readiness.data?.blockers.includes('PROFILE_NOT_FOUND')
      ? 'PROFILE_NOT_FOUND'
      : null;
  const showProfileIncomplete = profileBlocker === 'PROFILE_INCOMPLETE' || !isProfileComplete;
  const showProfileMissing = profileBlocker === 'PROFILE_NOT_FOUND';

  const isEmpty = !isPending && !isError && visibleCards.length === 0;
  const isStale = Boolean(readiness.data?.stale);
  const isEmbeddingPending = readiness.data?.blockers.includes('EMBEDDING_COVERAGE_LOW');
  const canGenerate = readiness.data?.canGenerateFromProfile ?? isProfileComplete;

  const generateError =
    generate.error instanceof Error
      ? generate.error.message
      : generate.isError
        ? 'Unable to generate recommendations.'
        : null;
  const generateResumeError =
    generateResume.error instanceof Error
      ? generateResume.error.message
      : generateResume.isError
        ? 'Unable to generate resume recommendations.'
        : null;
  const similarCards = similarJobs.data?.cards ?? [];
  const selectedResumeOption = resumeProfile.data?.sourceResumeId
    ? [{ id: resumeProfile.data.sourceResumeId, label: 'Confirmed resume' }]
    : [];

  const submitFeedback = (recommendationId: string, action: 'DISMISSED' | 'NOT_RELEVANT') => {
    setDismissedIds((prev) => ({ ...prev, [recommendationId]: true }));
    void feedback
      .mutateAsync({ recommendationId, action })
      .catch(() => setDismissedIds((prev) => ({ ...prev, [recommendationId]: false })));
  };

  const selectMode = (mode: RecommendationMode) => {
    setPage(1);
    const nextParams = new URLSearchParams(searchParams);

    if (mode === 'profile') {
      nextParams.delete('mode');
    } else {
      nextParams.set('mode', mode);
    }

    if (mode !== 'similar') {
      nextParams.delete('jobId');
    }

    setSearchParams(nextParams);
  };

  return (
    <Box component="section" sx={{ display: 'grid', gap: 3, py: 2 }}>
      <Box sx={{ display: 'grid', gap: 1 }}>
        <Typography component="h1" sx={{ fontWeight: 800, fontSize: '1.5rem', m: 0 }}>
          For You
        </Typography>
        <Typography sx={{ color: 'text.secondary' }}>
          Personalized matches from your profile. Generation is explicit - loading this page never
          starts a new run.
        </Typography>
      </Box>

      <Box
        aria-label="Recommendation modes"
        role="tablist"
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          gap: 1,
          maxWidth: '100%',
          overflowX: 'auto',
          pb: 1,
          scrollbarWidth: 'thin',
        }}
      >
        {recommendationModes.map((mode) => {
          const isActive = mode.id === activeMode;

          return (
            <Box
              aria-controls={getPanelId(mode.id)}
              aria-selected={isActive}
              component="button"
              id={getTabId(mode.id)}
              key={mode.id}
              onClick={() => selectMode(mode.id)}
              role="tab"
              sx={{
                alignItems: 'center',
                bgcolor: isActive ? 'primary.main' : 'background.paper',
                border: '1px solid',
                borderColor: isActive ? 'primary.main' : 'divider',
                borderRadius: 2,
                color: isActive ? 'primary.contrastText' : 'text.primary',
                cursor: 'pointer',
                display: 'inline-flex',
                flex: '0 0 auto',
                font: 'inherit',
                fontSize: '0.875rem',
                fontWeight: 700,
                gap: 1,
                minHeight: 40,
                px: 2,
                py: 1,
                whiteSpace: 'nowrap',
                '&:focus-visible': {
                  outline: '3px solid',
                  outlineColor: 'primary.light',
                  outlineOffset: 2,
                },
                '&:hover': {
                  borderColor: 'primary.main',
                },
              }}
              type="button"
            >
              <span>{mode.label}</span>
              {!mode.available ? (
                <Box
                  component="span"
                  sx={{
                    bgcolor: isActive ? 'rgba(255, 255, 255, 0.2)' : 'action.hover',
                    borderRadius: 999,
                    color: isActive ? 'primary.contrastText' : 'text.secondary',
                    fontSize: '0.6875rem',
                    fontWeight: 800,
                    lineHeight: 1,
                    px: 1,
                    py: 0.5,
                  }}
                >
                  Soon
                </Box>
              ) : null}
            </Box>
          );
        })}
      </Box>

      {activeMode === 'resume' ? (
        <Box
          aria-labelledby={getTabId('resume')}
          id={getPanelId('resume')}
          role="tabpanel"
          sx={{ display: 'grid', gap: 3 }}
        >
          {resumeProfile.isPending ? (
            <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
              <CircularProgress aria-label="Loading resume source" />
            </Box>
          ) : null}

          {resumeProfile.isError ? (
            <Box sx={{ display: 'grid', gap: 2, justifyItems: 'start' }}>
              <Box role="alert">
                <Typography>
                  {resumeProfile.error instanceof Error
                    ? resumeProfile.error.message
                    : 'Unable to load your resume profile.'}
                </Typography>
              </Box>
              <Button
                disabled={resumeProfile.isFetching}
                onClick={() => void resumeProfile.refetch()}
                size="small"
              >
                Retry
              </Button>
            </Box>
          ) : null}

          {!resumeProfile.isPending && !resumeProfile.isError && selectedResumeOption.length === 0 ? (
            <Box sx={{ display: 'grid', gap: 2, justifyItems: 'start', py: 4 }}>
              <Typography component="h2" sx={{ fontSize: '1rem', fontWeight: 800, m: 0 }}>
                Resume recommendations
              </Typography>
              <Typography role="status" sx={{ color: 'text.secondary' }}>
                Upload and confirm a parsed resume before generating resume-based matches.
              </Typography>
              <Button component={RouterLink} size="small" to={ROUTES.PROFILE} variant="outline">
                Add resume
              </Button>
            </Box>
          ) : null}

          {!resumeProfile.isPending && !resumeProfile.isError && selectedResumeOption.length > 0 ? (
            <Box sx={{ display: 'grid', gap: 2, justifyItems: 'start' }}>
              <TextField
                label="Completed resume"
                onChange={(event) => setSelectedResumeId(event.target.value)}
                select
                size="small"
                sx={{ maxWidth: 360, width: '100%' }}
                value={selectedResumeId}
              >
                {selectedResumeOption.map((resume) => (
                  <MenuItem key={resume.id} value={resume.id}>
                    {resume.label}
                  </MenuItem>
                ))}
              </TextField>

              {generateResumeError ? (
                <Typography role="alert" sx={{ color: 'error.main' }}>
                  {generateResumeError}
                </Typography>
              ) : null}

              <Button
                disabled={!selectedResumeId || generateResume.isPending}
                isLoading={generateResume.isPending}
                onClick={() => {
                  if (!selectedResumeId) return;
                  setResumeGeneratedOnce(true);
                  void generateResume
                    .mutateAsync(selectedResumeId)
                    .then((items) => setResumeRecommendations(items.map(mapRecommendationDtoToCard)))
                    .catch(() => undefined);
                }}
                size="small"
              >
                Generate from resume
              </Button>
            </Box>
          ) : null}

          {resumeGeneratedOnce &&
          !generateResume.isPending &&
          !generateResume.isError &&
          resumeRecommendations.length === 0 ? (
            <Typography role="status" sx={{ color: 'text.secondary', py: 4 }}>
              No matching jobs were found for this resume.
            </Typography>
          ) : null}

          {resumeRecommendations.length > 0 ? (
            <>
              <Typography sx={{ color: 'text.secondary' }}>
                {resumeRecommendations.length} resume recommendation
                {resumeRecommendations.length === 1 ? '' : 's'}
              </Typography>
              <VirtualizedJobList
                ariaLabel="Resume recommendations"
                getKey={(job) => job.recommendationId ?? job.id ?? `${job.company}-${job.title}`}
                items={resumeRecommendations}
                renderItem={(job) => (
                  <JobCard
                    job={job}
                    isSaved={Boolean(job.id && savedIdSet.has(job.id))}
                    onApply={(selected) => {
                      openExternalApply(selected.applyUrl);
                    }}
                    onDismiss={
                      job.recommendationId
                        ? (selected) => submitFeedback(selected.recommendationId!, 'DISMISSED')
                        : undefined
                    }
                    onNotRelevant={
                      job.recommendationId
                        ? (selected) => submitFeedback(selected.recommendationId!, 'NOT_RELEVANT')
                        : undefined
                    }
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
            </>
          ) : null}
        </Box>
      ) : null}

      {activeMode === 'similar' ? (
        <Box
          aria-labelledby={getTabId('similar')}
          id={getPanelId('similar')}
          role="tabpanel"
          sx={{ display: 'grid', gap: 3 }}
        >
          {!similarSourceJobId ? (
            <Box sx={{ display: 'grid', gap: 2, justifyItems: 'start', py: 4 }}>
              <Typography component="h2" sx={{ fontSize: '1rem', fontWeight: 800, m: 0 }}>
                Similar jobs
              </Typography>
              <Typography role="status" sx={{ color: 'text.secondary' }}>
                Open a job detail page to choose the source job for this mode.
              </Typography>
              <Button component={RouterLink} size="small" to={ROUTES.JOB_FEED} variant="outline">
                Browse jobs
              </Button>
            </Box>
          ) : null}

          {similarSourceJobId && similarJobs.isPending ? (
            <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
              <CircularProgress aria-label="Loading similar jobs" />
            </Box>
          ) : null}

          {similarSourceJobId && similarJobs.isError ? (
            <Box sx={{ display: 'grid', gap: 2, justifyItems: 'start' }}>
              <Box role="alert">
                <Typography>
                  {similarJobs.error instanceof Error
                    ? similarJobs.error.message
                    : 'Unable to load similar jobs.'}
                </Typography>
              </Box>
              <Button
                disabled={similarJobs.isFetching}
                onClick={() => void similarJobs.refetch()}
                size="small"
              >
                Retry
              </Button>
            </Box>
          ) : null}

          {similarSourceJobId &&
          !similarJobs.isPending &&
          !similarJobs.isError &&
          similarCards.length === 0 ? (
            <Typography role="status" sx={{ color: 'text.secondary', py: 4 }}>
              No similar jobs found for this job.
            </Typography>
          ) : null}

          {similarCards.length > 0 ? (
            <>
              <Typography sx={{ color: 'text.secondary' }}>
                {similarCards.length} similar job{similarCards.length === 1 ? '' : 's'}
              </Typography>
              <VirtualizedJobList
                ariaLabel="Similar jobs"
                getKey={(job) => job.id ?? `${job.company}-${job.title}`}
                items={similarCards}
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
            </>
          ) : null}
        </Box>
      ) : null}

      {activeMode !== 'profile' && activeMode !== 'resume' && activeMode !== 'similar' ? (
        <Box
          aria-labelledby={getTabId(activeMode)}
          id={getPanelId(activeMode)}
          role="tabpanel"
          sx={{ display: 'grid', gap: 2, justifyItems: 'start', py: 4 }}
        >
          <Typography component="h2" sx={{ fontSize: '1rem', fontWeight: 800, m: 0 }}>
            {activeModeMeta.panelLabel}
          </Typography>
          <Typography role="status" sx={{ color: 'text.secondary' }}>
            This mode is being wired into the recommendation engine.
          </Typography>
          <Button onClick={() => selectMode('profile')} size="small" variant="outline">
            View profile matches
          </Button>
        </Box>
      ) : null}

      {activeMode === 'profile' && readiness.isError ? (
        <Alert role="alert" severity="warning">
          Could not load recommendation readiness. You can still browse saved recommendations below.
        </Alert>
      ) : null}

      {activeMode === 'profile' && isStale ? (
        <Alert role="status" severity="info">
          Your profile changed since these matches were generated. Refresh to update recommendations.
        </Alert>
      ) : null}

      {activeMode === 'profile' && isEmbeddingPending ? (
        <Alert role="status" severity="warning">
          Job embedding index is still warming up. Results may be limited until indexing completes.
        </Alert>
      ) : null}

      {activeMode === 'profile' && isPending ? (
        <Box
          aria-labelledby={getTabId('profile')}
          id={getPanelId('profile')}
          role="tabpanel"
          sx={{ display: 'grid', placeItems: 'center', py: 8 }}
        >
          <CircularProgress aria-label="Loading recommendations" />
        </Box>
      ) : null}

      {activeMode === 'profile' && isError ? (
        <Box
          aria-labelledby={getTabId('profile')}
          id={getPanelId('profile')}
          role="tabpanel"
          sx={{ display: 'grid', gap: 2, justifyItems: 'start' }}
        >
          <Box role="alert">
            <Typography>
              {error instanceof Error ? error.message : 'Unable to load recommendations.'}
            </Typography>
          </Box>
          <Button disabled={isFetching} onClick={() => void refetch()} size="small">
            Retry
          </Button>
        </Box>
      ) : null}

      {activeMode === 'profile' &&
      !isPending &&
      !isError &&
      (isEmpty || visibleCards.length > 0) ? (
        <Box
          aria-labelledby={getTabId('profile')}
          id={getPanelId('profile')}
          role="tabpanel"
          sx={{ display: 'grid', gap: 3 }}
        >
          {isEmpty && showProfileIncomplete ? (
            <Box sx={{ display: 'grid', gap: 2, justifyItems: 'start', py: 4 }}>
              <Typography role="status">
                Complete your profile so we can score jobs against your skills and experience.
              </Typography>
              <Button component={RouterLink} size="small" to={ROUTES.PROFILE} variant="outline">
                Complete profile
              </Button>
            </Box>
          ) : null}

          {isEmpty && showProfileMissing ? (
            <Box sx={{ display: 'grid', gap: 2, justifyItems: 'start', py: 4 }}>
              <Typography role="status">
                We could not find a candidate profile for your account. Complete onboarding to
                continue.
              </Typography>
              <Button component={RouterLink} size="small" to={ROUTES.PROFILE} variant="outline">
                Set up profile
              </Button>
            </Box>
          ) : null}

          {isEmpty && canGenerate && !showProfileIncomplete && !showProfileMissing ? (
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

          {visibleCards.length > 0 ? (
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
                getKey={(job) => job.recommendationId ?? job.id ?? `${job.company}-${job.title}`}
                items={visibleCards}
                renderItem={(job) => (
                  <JobCard
                    job={job}
                    isSaved={Boolean(job.id && savedIdSet.has(job.id))}
                    onApply={(selected) => {
                      openExternalApply(selected.applyUrl);
                    }}
                    onDismiss={
                      job.recommendationId
                        ? (selected) => submitFeedback(selected.recommendationId!, 'DISMISSED')
                        : undefined
                    }
                    onNotRelevant={
                      job.recommendationId
                        ? (selected) => submitFeedback(selected.recommendationId!, 'NOT_RELEVANT')
                        : undefined
                    }
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
      ) : null}
    </Box>
  );
}
