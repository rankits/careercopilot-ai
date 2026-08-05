import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link as RouterLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';
import { JobCard, VirtualizedJobList, type JobCardData } from '@/components/molecules';

import { useSaveJob, savedJobsQueryKey } from '@/features/applications/hooks/useSaveJob';
import {
  useCreateSavedSearch,
  useDeleteSavedSearch,
  useGenerateCareerGoalRecommendations,
  useGenerateRecommendations,
  useGenerateResumeRecommendations,
  useGenerateSavedSearchRecommendations,
  useGenerateTextRecommendations,
  mapRecommendationDtoToCard,
  useRefreshProfileRecommendations,
  useRecommendationFeedback,
  useRecommendationReadiness,
  useRecommendations,
  useSavedSearches,
  useSimilarJobs,
} from '@/features/recommendations/hooks/useRecommendations';
import { useAppSelector } from '@/hooks/redux';

import { jobDetailPath, ROUTES } from '@/constants/routes';
import { applicationsService } from '@/features/applications/services/applications.service';
import { openExternalApply } from '@/features/jobs/utils/openExternalApply';
import type {
  RecommendationDto,
  RecommendationFeedbackAction,
  RecommendationReadinessStatus,
} from '@/features/recommendations/types/recommendation.types';
import { formatRecommendationCategoryLabel } from '@/features/recommendations/utils/formatRecommendationMatchLabel';
import { resumeService } from '@/features/resume/services/resume.service';
import { Alert, Box, CircularProgress, MenuItem, TextField, Typography } from '@/lib/material';

type RecommendationMode = 'profile' | 'resume' | 'similar' | 'text-career' | 'career' | 'saved';
type RecommendationLifecycleState = NonNullable<RecommendationReadinessStatus['lifecycleState']>;
const TARGET_TEXT_MAX_LENGTH = 20_000;
const CAREER_GOAL_MAX_LENGTH = 20_000;

const recommendationModes: Array<{
  id: RecommendationMode;
  label: string;
  panelLabel: string;
  available: boolean;
}> = [
  { id: 'profile', label: 'Profile', panelLabel: 'Profile recommendations', available: true },
  { id: 'resume', label: 'Resume', panelLabel: 'Resume recommendations', available: true },
  { id: 'similar', label: 'Similar', panelLabel: 'Similar jobs', available: true },
  { id: 'text-career', label: 'Text', panelLabel: 'Text matches', available: true },
  { id: 'career', label: 'Career', panelLabel: 'Career goal matches', available: true },
  { id: 'saved', label: 'Saved', panelLabel: 'Saved search recommendations', available: true },
];

const careerCategoryOrder = [
  'BEST_MATCH',
  'GOOD_MATCH',
  'STRETCH_OPPORTUNITY',
  'RELATED_CAREER_PATH',
];

const careerCategoryCopy: Record<string, string> = {
  BEST_MATCH: 'Target-role matches',
  GOOD_MATCH: 'Transitional matches',
  STRETCH_OPPORTUNITY: 'Stretch matches',
  RELATED_CAREER_PATH: 'Current and adjacent paths',
};

const groupCareerRecommendations = (items: readonly RecommendationDto[]) => {
  const byCategory = new Map<string, RecommendationDto[]>();
  for (const item of items) {
    const category = item.category || 'RELATED_CAREER_PATH';
    byCategory.set(category, [...(byCategory.get(category) ?? []), item]);
  }
  return [
    ...careerCategoryOrder.map((category) => [category, byCategory.get(category) ?? []] as const),
    ...[...byCategory.entries()].filter(([category]) => !careerCategoryOrder.includes(category)),
  ].filter(([, categoryItems]) => categoryItems.length > 0);
};

const recommendationModeIds = new Set(recommendationModes.map((mode) => mode.id));

const getModeFromSearchParams = (searchParams: URLSearchParams): RecommendationMode => {
  const requestedMode = searchParams.get('mode');

  return requestedMode && recommendationModeIds.has(requestedMode as RecommendationMode)
    ? (requestedMode as RecommendationMode)
    : 'profile';
};

const getTabId = (mode: RecommendationMode) => `ai-match-${mode}-tab`;
const getPanelId = (mode: RecommendationMode) => `ai-match-${mode}-panel`;

const failedLifecycleStates = new Set<RecommendationLifecycleState>([
  'FAILED',
  'FAILED_TIMEOUT',
  'FAILED_PROVIDER',
  'FAILED_EMPTY',
]);

const getFailureCopy = (state: RecommendationLifecycleState | undefined) => {
  switch (state) {
    case 'FAILED_TIMEOUT':
      return 'Recommendation generation timed out. Retry when you are ready.';
    case 'FAILED_PROVIDER':
      return 'The recommendation provider was unavailable. Retry to start a fresh run.';
    case 'FAILED_EMPTY':
      return 'No eligible jobs were found for the last run. Retry after updating your profile or job filters.';
    case 'FAILED':
      return 'The last recommendation run failed. Retry to start a fresh run.';
    default:
      return 'Unable to prepare recommendations. Retry to start a fresh run.';
  }
};

export function ForYouPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeMode = getModeFromSearchParams(searchParams);
  const similarSourceJobId = searchParams.get('jobId') || undefined;
  const activeModeMeta =
    recommendationModes.find((mode) => mode.id === activeMode) ?? recommendationModes[0]!;
  const isProfileComplete = useAppSelector((state) => state.auth.isProfileComplete);
  const [page, setPage] = useState(1);
  const [generatedOnce, setGeneratedOnce] = useState(false);
  const [resumeGeneratedOnce, setResumeGeneratedOnce] = useState(false);
  const [textGeneratedOnce, setTextGeneratedOnce] = useState(false);
  const [careerGeneratedOnce, setCareerGeneratedOnce] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [targetText, setTargetText] = useState('');
  const [careerGoalText, setCareerGoalText] = useState('');
  const [savedSearchName, setSavedSearchName] = useState('');
  const [savedSearchQueryText, setSavedSearchQueryText] = useState('');
  const [selectedSavedSearchId, setSelectedSavedSearchId] = useState('');
  const [savedSearchGeneratedOnce, setSavedSearchGeneratedOnce] = useState(false);
  const [savedSearchNotice, setSavedSearchNotice] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Record<string, boolean>>({});
  const [moreLikeThisIds, setMoreLikeThisIds] = useState<Record<string, boolean>>({});
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [resumeRecommendations, setResumeRecommendations] = useState<
    ReturnType<typeof mapRecommendationDtoToCard>[]
  >([]);
  const [textRecommendations, setTextRecommendations] = useState<
    ReturnType<typeof mapRecommendationDtoToCard>[]
  >([]);
  const [careerRecommendations, setCareerRecommendations] = useState<RecommendationDto[]>([]);
  const [savedSearchRecommendations, setSavedSearchRecommendations] = useState<
    ReturnType<typeof mapRecommendationDtoToCard>[]
  >([]);
  const modeTabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const trackedFeedbackKeys = useRef<Set<string>>(new Set());

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
  const refreshProfile = useRefreshProfileRecommendations();
  const generateResume = useGenerateResumeRecommendations();
  const generateText = useGenerateTextRecommendations();
  const generateCareerGoal = useGenerateCareerGoalRecommendations();
  const createSavedSearch = useCreateSavedSearch();
  const deleteSavedSearch = useDeleteSavedSearch();
  const generateSavedSearch = useGenerateSavedSearchRecommendations();
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
      activeMode === 'text-career' ||
      activeMode === 'career' ||
      activeMode === 'saved' ||
      (activeMode === 'similar' && Boolean(similarSourceJobId)),
  });
  const similarJobs = useSimilarJobs(similarSourceJobId, {
    enabled: activeMode === 'similar' && Boolean(similarSourceJobId),
    limit: 20,
  });
  const savedSearches = useSavedSearches({ enabled: activeMode === 'saved' });
  const [optimisticSaved, setOptimisticSaved] = useState<Record<string, boolean>>({});

  const trackRecommendationFeedback = useCallback(
    (recommendationId: string | undefined, action: RecommendationFeedbackAction) => {
      if (!recommendationId) return;
      const key = `${action}:${recommendationId}`;
      if (trackedFeedbackKeys.current.has(key)) return;
      trackedFeedbackKeys.current.add(key);
      void feedback.mutateAsync({ recommendationId, action }).catch(() => {
        trackedFeedbackKeys.current.delete(key);
      });
    },
    [feedback],
  );

  useEffect(() => {
    const sourceResumeId = resumeProfile.data?.sourceResumeId;
    if (sourceResumeId && !selectedResumeId) {
      setSelectedResumeId(sourceResumeId);
    }
  }, [resumeProfile.data?.sourceResumeId, selectedResumeId]);

  useEffect(() => {
    const firstSearchId = savedSearches.data?.items[0]?.id;
    if (activeMode === 'saved' && firstSearchId && !selectedSavedSearchId) {
      setSelectedSavedSearchId(firstSearchId);
    }
  }, [activeMode, savedSearches.data?.items, selectedSavedSearchId]);

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
  const lifecycleState = readiness.data?.lifecycleState;
  const isProcessingLifecycle = lifecycleState === 'QUEUED' || lifecycleState === 'PROCESSING';
  const isFailedLifecycle = lifecycleState ? failedLifecycleStates.has(lifecycleState) : false;
  const profileActionPending = generate.isPending || refreshProfile.isPending;

  const generateError =
    generate.error instanceof Error
      ? generate.error.message
      : generate.isError
        ? 'Unable to generate recommendations.'
        : null;
  const refreshError =
    refreshProfile.error instanceof Error
      ? refreshProfile.error.message
      : refreshProfile.isError
        ? 'Unable to refresh recommendations.'
        : null;
  const generateResumeError =
    generateResume.error instanceof Error
      ? generateResume.error.message
      : generateResume.isError
        ? 'Unable to generate resume recommendations.'
        : null;
  const generateTextError =
    generateText.error instanceof Error
      ? generateText.error.message
      : generateText.isError
        ? 'Unable to generate text recommendations.'
        : null;
  const generateCareerError =
    generateCareerGoal.error instanceof Error
      ? generateCareerGoal.error.message
      : generateCareerGoal.isError
        ? 'Unable to generate career goal recommendations.'
        : null;
  const savedSearchError =
    savedSearches.error instanceof Error
      ? savedSearches.error.message
      : savedSearches.isError
        ? 'Unable to load saved searches.'
        : createSavedSearch.error instanceof Error
          ? createSavedSearch.error.message
          : createSavedSearch.isError
            ? 'Unable to create saved search.'
            : deleteSavedSearch.error instanceof Error
              ? deleteSavedSearch.error.message
              : deleteSavedSearch.isError
                ? 'Unable to delete saved search.'
                : generateSavedSearch.error instanceof Error
                  ? generateSavedSearch.error.message
                  : generateSavedSearch.isError
                    ? 'Unable to generate saved-search recommendations.'
                    : null;
  const similarCards = similarJobs.data?.cards ?? [];
  const selectedResumeOption = resumeProfile.data?.sourceResumeId
    ? [{ id: resumeProfile.data.sourceResumeId, label: 'Confirmed resume' }]
    : [];
  const trimmedTargetText = targetText.trim();
  const targetTextTooLong = trimmedTargetText.length > TARGET_TEXT_MAX_LENGTH;
  const trimmedCareerGoalText = careerGoalText.trim();
  const careerGoalTooLong = trimmedCareerGoalText.length > CAREER_GOAL_MAX_LENGTH;
  const trimmedSavedSearchName = savedSearchName.trim();
  const trimmedSavedSearchQuery = savedSearchQueryText.trim();
  const savedSearchesList = savedSearches.data?.items ?? [];
  const selectedSavedSearch = savedSearchesList.find((item) => item.id === selectedSavedSearchId);
  const visibleResumeRecommendations = useMemo(
    () =>
      resumeRecommendations.filter(
        (card) => !card.recommendationId || !dismissedIds[card.recommendationId],
      ),
    [dismissedIds, resumeRecommendations],
  );
  const visibleTextRecommendations = useMemo(
    () =>
      textRecommendations.filter(
        (card) => !card.recommendationId || !dismissedIds[card.recommendationId],
      ),
    [dismissedIds, textRecommendations],
  );
  const visibleCareerRecommendations = useMemo(
    () => careerRecommendations.filter((item) => !dismissedIds[item.id]),
    [careerRecommendations, dismissedIds],
  );
  const visibleSavedSearchRecommendations = savedSearchRecommendations.filter(
    (card) => !card.recommendationId || !dismissedIds[card.recommendationId],
  );
  const careerGroups = groupCareerRecommendations(visibleCareerRecommendations);
  const viewedRecommendationIds = useMemo(
    () =>
      [
        ...visibleCards.map((card) => card.recommendationId),
        ...visibleResumeRecommendations.map((card) => card.recommendationId),
        ...visibleTextRecommendations.map((card) => card.recommendationId),
        ...visibleCareerRecommendations.map((item) => item.id),
        ...visibleSavedSearchRecommendations.map((card) => card.recommendationId),
      ].filter((id): id is string => Boolean(id)),
    [
      visibleCards,
      visibleResumeRecommendations,
      visibleTextRecommendations,
      visibleCareerRecommendations,
      visibleSavedSearchRecommendations,
    ],
  );

  useEffect(() => {
    for (const recommendationId of viewedRecommendationIds) {
      trackRecommendationFeedback(recommendationId, 'VIEWED');
    }
  }, [trackRecommendationFeedback, viewedRecommendationIds]);

  const submitFeedback = (
    recommendationId: string,
    action: Extract<
      RecommendationFeedbackAction,
      'DISMISSED' | 'NOT_RELEVANT' | 'MORE_LIKE_THIS' | 'LESS_LIKE_THIS'
    >,
  ) => {
    const hidesCard = action !== 'MORE_LIKE_THIS';
    if (hidesCard) {
      setDismissedIds((prev) => ({ ...prev, [recommendationId]: true }));
    } else {
      setMoreLikeThisIds((prev) => ({ ...prev, [recommendationId]: true }));
    }
    void feedback
      .mutateAsync({ recommendationId, action })
      .then(() => {
        setFeedbackNotice(
          action === 'MORE_LIKE_THIS'
            ? 'Future matches will lean toward jobs like this.'
            : 'Future matches will avoid jobs like this.',
        );
      })
      .catch(() => {
        if (hidesCard) {
          setDismissedIds((prev) => ({ ...prev, [recommendationId]: false }));
        } else {
          setMoreLikeThisIds((prev) => ({ ...prev, [recommendationId]: false }));
        }
      });
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

  const focusModeTab = (index: number) => {
    const nextIndex = (index + recommendationModes.length) % recommendationModes.length;
    const mode = recommendationModes[nextIndex];
    if (!mode) return;

    selectMode(mode.id);
    window.setTimeout(() => modeTabRefs.current[nextIndex]?.focus(), 0);
  };

  const handleModeTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        focusModeTab(index - 1);
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        focusModeTab(index + 1);
        break;
      case 'Home':
        event.preventDefault();
        focusModeTab(0);
        break;
      case 'End':
        event.preventDefault();
        focusModeTab(recommendationModes.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <Box component="section" sx={{ display: 'grid', gap: 3, py: 2 }}>
      <Box sx={{ display: 'grid', gap: 1 }}>
        <Typography component="h1" sx={{ fontWeight: 800, fontSize: '1.5rem', m: 0 }}>
          AI Match
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
        {recommendationModes.map((mode, index) => {
          const isActive = mode.id === activeMode;

          return (
            <Box
              aria-controls={getPanelId(mode.id)}
              aria-selected={isActive}
              component="button"
              id={getTabId(mode.id)}
              key={mode.id}
              onKeyDown={(event) => handleModeTabKeyDown(event, index)}
              onClick={() => selectMode(mode.id)}
              ref={(element: HTMLButtonElement | null) => {
                modeTabRefs.current[index] = element;
              }}
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
              tabIndex={isActive ? 0 : -1}
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

      {feedbackNotice ? (
        <Alert onClose={() => setFeedbackNotice(null)} role="status" severity="success">
          {feedbackNotice}
        </Alert>
      ) : null}

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

          {!resumeProfile.isPending &&
          !resumeProfile.isError &&
          selectedResumeOption.length === 0 ? (
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
                    .then((items) =>
                      setResumeRecommendations(items.map(mapRecommendationDtoToCard)),
                    )
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
          visibleResumeRecommendations.length === 0 ? (
            <Typography role="status" sx={{ color: 'text.secondary', py: 4 }}>
              No matching jobs were found for this resume.
            </Typography>
          ) : null}

          {visibleResumeRecommendations.length > 0 ? (
            <>
              <Typography sx={{ color: 'text.secondary' }}>
                {visibleResumeRecommendations.length} resume recommendation
                {visibleResumeRecommendations.length === 1 ? '' : 's'}
              </Typography>
              <VirtualizedJobList
                ariaLabel="Resume recommendations"
                getKey={(job) => job.recommendationId ?? job.id ?? `${job.company}-${job.title}`}
                items={visibleResumeRecommendations}
                renderItem={(job) => (
                  <JobCard
                    job={job}
                    isSaved={Boolean(job.id && savedIdSet.has(job.id))}
                    onApply={handleRecommendedApply}
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
                    onMoreLikeThis={
                      job.recommendationId
                        ? (selected) => submitFeedback(selected.recommendationId!, 'MORE_LIKE_THIS')
                        : undefined
                    }
                    onLessLikeThis={
                      job.recommendationId
                        ? (selected) => submitFeedback(selected.recommendationId!, 'LESS_LIKE_THIS')
                        : undefined
                    }
                    isMoreLikeThis={Boolean(
                      job.recommendationId && moreLikeThisIds[job.recommendationId],
                    )}
                    onOpen={(selected) => {
                      if (!selected.id) return;
                      trackRecommendationFeedback(job.recommendationId, 'OPENED');
                      void navigate(jobDetailPath(selected.id), {
                        state: { fromFeed: `${location.pathname}${location.search}` },
                      });
                    }}
                    onSave={handleRecommendedSave}
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
                    onApply={handleRecommendedApply}
                    onOpen={(selected) => {
                      if (!selected.id) return;
                      trackRecommendationFeedback(job.recommendationId, 'OPENED');
                      void navigate(jobDetailPath(selected.id), {
                        state: { fromFeed: `${location.pathname}${location.search}` },
                      });
                    }}
                    onSave={handleRecommendedSave}
                  />
                )}
              />
            </>
          ) : null}
        </Box>
      ) : null}

      {activeMode === 'career' ? (
        <Box
          aria-labelledby={getTabId('career')}
          id={getPanelId('career')}
          role="tabpanel"
          sx={{ display: 'grid', gap: 3 }}
        >
          <Box sx={{ display: 'grid', gap: 2, justifyItems: 'start' }}>
            <TextField
              error={careerGoalTooLong}
              fullWidth
              helperText={
                careerGoalTooLong
                  ? `Use ${CAREER_GOAL_MAX_LENGTH.toLocaleString()} characters or fewer.`
                  : `${trimmedCareerGoalText.length.toLocaleString()} / ${CAREER_GOAL_MAX_LENGTH.toLocaleString()}`
              }
              label="Career goal"
              multiline
              minRows={5}
              onChange={(event) => setCareerGoalText(event.target.value)}
              placeholder="Describe the role, transition, or direction you want to pursue."
              value={careerGoalText}
            />

            {generateCareerError ? (
              <Typography role="alert" sx={{ color: 'error.main' }}>
                {generateCareerError}
              </Typography>
            ) : null}

            <Button
              disabled={!trimmedCareerGoalText || careerGoalTooLong || generateCareerGoal.isPending}
              isLoading={generateCareerGoal.isPending}
              onClick={() => {
                if (!trimmedCareerGoalText || careerGoalTooLong) return;
                setCareerGeneratedOnce(true);
                void generateCareerGoal
                  .mutateAsync(trimmedCareerGoalText)
                  .then((items) => setCareerRecommendations(items))
                  .catch(() => undefined);
              }}
              size="small"
            >
              Generate career matches
            </Button>
          </Box>

          {!careerGeneratedOnce &&
          !generateCareerGoal.isPending &&
          careerRecommendations.length === 0 ? (
            <Typography role="status" sx={{ color: 'text.secondary', py: 2 }}>
              Enter a career goal to generate target, transition, stretch, and adjacent-path
              matches.
            </Typography>
          ) : null}

          {careerGeneratedOnce &&
          !generateCareerGoal.isPending &&
          !generateCareerGoal.isError &&
          visibleCareerRecommendations.length === 0 ? (
            <Typography role="status" sx={{ color: 'text.secondary', py: 4 }}>
              No matching jobs were found for this career goal.
            </Typography>
          ) : null}

          {careerGroups.map(([category, items]) => (
            <Box component="section" key={category} sx={{ display: 'grid', gap: 2 }}>
              <Box sx={{ alignItems: 'baseline', display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Typography component="h2" sx={{ fontSize: '1rem', fontWeight: 800, m: 0 }}>
                  {careerCategoryCopy[category] ?? formatRecommendationCategoryLabel(category)}
                </Typography>
                <Typography sx={{ color: 'text.secondary' }}>
                  {items.length} {items.length === 1 ? 'match' : 'matches'}
                </Typography>
              </Box>
              <VirtualizedJobList
                ariaLabel={`${careerCategoryCopy[category] ?? category} career recommendations`}
                getKey={(job) => job.recommendationId ?? job.id ?? `${job.company}-${job.title}`}
                items={items.map((item, index) => mapRecommendationDtoToCard(item, index))}
                renderItem={(job) => (
                  <JobCard
                    job={job}
                    isSaved={Boolean(job.id && savedIdSet.has(job.id))}
                    onApply={handleRecommendedApply}
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
                    onMoreLikeThis={
                      job.recommendationId
                        ? (selected) => submitFeedback(selected.recommendationId!, 'MORE_LIKE_THIS')
                        : undefined
                    }
                    onLessLikeThis={
                      job.recommendationId
                        ? (selected) => submitFeedback(selected.recommendationId!, 'LESS_LIKE_THIS')
                        : undefined
                    }
                    isMoreLikeThis={Boolean(
                      job.recommendationId && moreLikeThisIds[job.recommendationId],
                    )}
                    onOpen={(selected) => {
                      if (!selected.id) return;
                      trackRecommendationFeedback(job.recommendationId, 'OPENED');
                      void navigate(jobDetailPath(selected.id), {
                        state: { fromFeed: `${location.pathname}${location.search}` },
                      });
                    }}
                    onSave={handleRecommendedSave}
                  />
                )}
              />
            </Box>
          ))}
        </Box>
      ) : null}

      {activeMode === 'text-career' ? (
        <Box
          aria-labelledby={getTabId('text-career')}
          id={getPanelId('text-career')}
          role="tabpanel"
          sx={{ display: 'grid', gap: 3 }}
        >
          <Box sx={{ display: 'grid', gap: 2, justifyItems: 'start' }}>
            <TextField
              error={targetTextTooLong}
              fullWidth
              helperText={
                targetTextTooLong
                  ? `Use ${TARGET_TEXT_MAX_LENGTH.toLocaleString()} characters or fewer.`
                  : `${trimmedTargetText.length.toLocaleString()} / ${TARGET_TEXT_MAX_LENGTH.toLocaleString()}`
              }
              label="Target role text"
              multiline
              minRows={5}
              onChange={(event) => setTargetText(event.target.value)}
              placeholder="Paste a target role, career goal, or job-search brief."
              value={targetText}
            />

            {generateTextError ? (
              <Typography role="alert" sx={{ color: 'error.main' }}>
                {generateTextError}
              </Typography>
            ) : null}

            <Button
              disabled={!trimmedTargetText || targetTextTooLong || generateText.isPending}
              isLoading={generateText.isPending}
              onClick={() => {
                if (!trimmedTargetText || targetTextTooLong) return;
                setTextGeneratedOnce(true);
                void generateText
                  .mutateAsync(trimmedTargetText)
                  .then((items) => setTextRecommendations(items.map(mapRecommendationDtoToCard)))
                  .catch(() => undefined);
              }}
              size="small"
            >
              Generate from text
            </Button>
          </Box>

          {!textGeneratedOnce &&
          !generateText.isPending &&
          visibleTextRecommendations.length === 0 ? (
            <Typography role="status" sx={{ color: 'text.secondary', py: 2 }}>
              Paste a target role or career note to generate text-based matches.
            </Typography>
          ) : null}

          {textGeneratedOnce &&
          !generateText.isPending &&
          !generateText.isError &&
          visibleTextRecommendations.length === 0 ? (
            <Typography role="status" sx={{ color: 'text.secondary', py: 4 }}>
              No matching jobs were found for this text.
            </Typography>
          ) : null}

          {visibleTextRecommendations.length > 0 ? (
            <>
              <Typography sx={{ color: 'text.secondary' }}>
                {visibleTextRecommendations.length} text recommendation
                {visibleTextRecommendations.length === 1 ? '' : 's'}
              </Typography>
              <VirtualizedJobList
                ariaLabel="Text recommendations"
                getKey={(job) => job.recommendationId ?? job.id ?? `${job.company}-${job.title}`}
                items={visibleTextRecommendations}
                renderItem={(job) => (
                  <JobCard
                    job={job}
                    isSaved={Boolean(job.id && savedIdSet.has(job.id))}
                    onApply={handleRecommendedApply}
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
                    onMoreLikeThis={
                      job.recommendationId
                        ? (selected) => submitFeedback(selected.recommendationId!, 'MORE_LIKE_THIS')
                        : undefined
                    }
                    onLessLikeThis={
                      job.recommendationId
                        ? (selected) => submitFeedback(selected.recommendationId!, 'LESS_LIKE_THIS')
                        : undefined
                    }
                    isMoreLikeThis={Boolean(
                      job.recommendationId && moreLikeThisIds[job.recommendationId],
                    )}
                    onOpen={(selected) => {
                      if (!selected.id) return;
                      trackRecommendationFeedback(job.recommendationId, 'OPENED');
                      void navigate(jobDetailPath(selected.id), {
                        state: { fromFeed: `${location.pathname}${location.search}` },
                      });
                    }}
                    onSave={handleRecommendedSave}
                  />
                )}
              />
            </>
          ) : null}
        </Box>
      ) : null}

      {activeMode === 'saved' ? (
        <Box
          aria-labelledby={getTabId('saved')}
          id={getPanelId('saved')}
          role="tabpanel"
          sx={{ display: 'grid', gap: 3 }}
        >
          {savedSearches.isPending ? (
            <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
              <CircularProgress aria-label="Loading saved searches" />
            </Box>
          ) : null}

          {savedSearchError ? (
            <Typography role="alert" sx={{ color: 'error.main' }}>
              {savedSearchError}
            </Typography>
          ) : null}

          {savedSearchNotice ? (
            <Alert onClose={() => setSavedSearchNotice(null)} role="status" severity="success">
              {savedSearchNotice}
            </Alert>
          ) : null}

          <Box sx={{ display: 'grid', gap: 2, justifyItems: 'start' }}>
            <TextField
              fullWidth
              label="Saved search name"
              onChange={(event) => setSavedSearchName(event.target.value)}
              size="small"
              value={savedSearchName}
            />
            <TextField
              fullWidth
              label="Search query"
              multiline
              minRows={3}
              onChange={(event) => setSavedSearchQueryText(event.target.value)}
              placeholder="Example: Remote TypeScript platform engineer"
              value={savedSearchQueryText}
            />
            <Button
              disabled={!trimmedSavedSearchName || createSavedSearch.isPending}
              isLoading={createSavedSearch.isPending}
              onClick={() => {
                if (!trimmedSavedSearchName) return;
                void createSavedSearch
                  .mutateAsync({
                    name: trimmedSavedSearchName,
                    ...(trimmedSavedSearchQuery ? { query: trimmedSavedSearchQuery } : {}),
                  })
                  .then((savedSearch) => {
                    setSelectedSavedSearchId(savedSearch.id);
                    setSavedSearchName('');
                    setSavedSearchQueryText('');
                    setSavedSearchNotice('Saved search created.');
                  })
                  .catch(() => undefined);
              }}
              size="small"
            >
              Create saved search
            </Button>
          </Box>

          {!savedSearches.isPending && !savedSearches.isError && savedSearchesList.length === 0 ? (
            <Typography role="status" sx={{ color: 'text.secondary', py: 2 }}>
              No saved searches yet.
            </Typography>
          ) : null}

          {savedSearchesList.length > 0 ? (
            <Box sx={{ display: 'grid', gap: 2, justifyItems: 'start' }}>
              <TextField
                label="Saved search"
                onChange={(event) => setSelectedSavedSearchId(event.target.value)}
                select
                size="small"
                sx={{ maxWidth: 420, width: '100%' }}
                value={selectedSavedSearchId}
              >
                {savedSearchesList.map((savedSearch) => (
                  <MenuItem key={savedSearch.id} value={savedSearch.id}>
                    {savedSearch.name}
                  </MenuItem>
                ))}
              </TextField>

              {selectedSavedSearch?.query ? (
                <Typography sx={{ color: 'text.secondary' }}>
                  {selectedSavedSearch.query}
                </Typography>
              ) : null}

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Button
                  disabled={!selectedSavedSearchId || generateSavedSearch.isPending}
                  isLoading={generateSavedSearch.isPending}
                  onClick={() => {
                    if (!selectedSavedSearchId) return;
                    setSavedSearchGeneratedOnce(true);
                    void generateSavedSearch
                      .mutateAsync(selectedSavedSearchId)
                      .then((items) =>
                        setSavedSearchRecommendations(items.map(mapRecommendationDtoToCard)),
                      )
                      .catch(() => undefined);
                  }}
                  size="small"
                >
                  Rerun saved search
                </Button>
                <Button
                  disabled={!selectedSavedSearchId || deleteSavedSearch.isPending}
                  isLoading={deleteSavedSearch.isPending}
                  onClick={() => {
                    if (!selectedSavedSearchId) return;
                    const deletedId = selectedSavedSearchId;
                    void deleteSavedSearch
                      .mutateAsync(deletedId)
                      .then(() => {
                        setSelectedSavedSearchId('');
                        setSavedSearchRecommendations([]);
                        setSavedSearchNotice('Saved search deleted.');
                      })
                      .catch(() => undefined);
                  }}
                  size="small"
                  variant="outline"
                >
                  Delete saved search
                </Button>
              </Box>
            </Box>
          ) : null}

          {savedSearchGeneratedOnce &&
          !generateSavedSearch.isPending &&
          !generateSavedSearch.isError &&
          visibleSavedSearchRecommendations.length === 0 ? (
            <Typography role="status" sx={{ color: 'text.secondary', py: 4 }}>
              No matching jobs were found for this saved search.
            </Typography>
          ) : null}

          {visibleSavedSearchRecommendations.length > 0 ? (
            <>
              <Typography sx={{ color: 'text.secondary' }}>
                {visibleSavedSearchRecommendations.length} saved-search recommendation
                {visibleSavedSearchRecommendations.length === 1 ? '' : 's'}
              </Typography>
              <VirtualizedJobList
                ariaLabel="Saved search recommendations"
                getKey={(job) => job.recommendationId ?? job.id ?? `${job.company}-${job.title}`}
                items={visibleSavedSearchRecommendations}
                renderItem={(job) => (
                  <JobCard
                    job={job}
                    isSaved={Boolean(job.id && savedIdSet.has(job.id))}
                    onApply={handleRecommendedApply}
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
                    onMoreLikeThis={
                      job.recommendationId
                        ? (selected) => submitFeedback(selected.recommendationId!, 'MORE_LIKE_THIS')
                        : undefined
                    }
                    onLessLikeThis={
                      job.recommendationId
                        ? (selected) => submitFeedback(selected.recommendationId!, 'LESS_LIKE_THIS')
                        : undefined
                    }
                    isMoreLikeThis={Boolean(
                      job.recommendationId && moreLikeThisIds[job.recommendationId],
                    )}
                    onOpen={(selected) => {
                      if (!selected.id) return;
                      trackRecommendationFeedback(job.recommendationId, 'OPENED');
                      void navigate(jobDetailPath(selected.id), {
                        state: { fromFeed: `${location.pathname}${location.search}` },
                      });
                    }}
                    onSave={handleRecommendedSave}
                  />
                )}
              />
            </>
          ) : null}
        </Box>
      ) : null}

      {activeMode !== 'profile' &&
      activeMode !== 'resume' &&
      activeMode !== 'similar' &&
      activeMode !== 'career' &&
      activeMode !== 'saved' &&
      activeMode !== 'text-career' ? (
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
          <Box sx={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            <Typography component="span">
              Your profile changed since these matches were generated. Refresh to update
              recommendations.
            </Typography>
            <Button
              disabled={profileActionPending}
              isLoading={refreshProfile.isPending}
              onClick={() => {
                void refreshProfile.mutateAsync().catch(() => undefined);
              }}
              size="small"
              variant="outline"
            >
              Refresh matches
            </Button>
          </Box>
        </Alert>
      ) : null}

      {activeMode === 'profile' && isProcessingLifecycle ? (
        <Alert role="status" severity="info">
          <Box sx={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            <CircularProgress aria-label="Recommendations processing" size={20} />
            <Typography component="span">
              {lifecycleState === 'QUEUED'
                ? 'Your recommendation run is queued.'
                : 'Your recommendation run is processing.'}
            </Typography>
            <Button
              disabled={readiness.isFetching}
              onClick={() => void readiness.refetch()}
              size="small"
            >
              Refresh status
            </Button>
          </Box>
        </Alert>
      ) : null}

      {activeMode === 'profile' && isFailedLifecycle ? (
        <Alert role="alert" severity="error">
          <Box sx={{ display: 'grid', gap: 1, justifyItems: 'start' }}>
            <Typography component="span">
              {getFailureCopy(lifecycleState)}
              {lifecycleState ? ` Code: ${lifecycleState}.` : ''}
            </Typography>
            <Button
              disabled={!canGenerate || profileActionPending}
              isLoading={refreshProfile.isPending}
              onClick={() => {
                void refreshProfile.mutateAsync().catch(() => undefined);
              }}
              size="small"
            >
              Retry recommendations
            </Button>
          </Box>
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

          {isEmpty &&
          canGenerate &&
          !showProfileIncomplete &&
          !showProfileMissing &&
          !isProcessingLifecycle &&
          !isFailedLifecycle ? (
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
                disabled={profileActionPending}
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
                  disabled={profileActionPending || isProcessingLifecycle}
                  isLoading={refreshProfile.isPending}
                  onClick={() => {
                    setGeneratedOnce(true);
                    void refreshProfile.mutateAsync().catch(() => undefined);
                  }}
                  size="small"
                  variant="outline"
                >
                  Refresh matches
                </Button>
              </Box>
              {generateError || refreshError ? (
                <Typography role="alert" sx={{ color: 'error.main' }}>
                  {generateError ?? refreshError}
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
                    onApply={handleRecommendedApply}
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
                    onMoreLikeThis={
                      job.recommendationId
                        ? (selected) => submitFeedback(selected.recommendationId!, 'MORE_LIKE_THIS')
                        : undefined
                    }
                    onLessLikeThis={
                      job.recommendationId
                        ? (selected) => submitFeedback(selected.recommendationId!, 'LESS_LIKE_THIS')
                        : undefined
                    }
                    isMoreLikeThis={Boolean(
                      job.recommendationId && moreLikeThisIds[job.recommendationId],
                    )}
                    onOpen={(selected) => {
                      if (!selected.id) return;
                      trackRecommendationFeedback(job.recommendationId, 'OPENED');
                      void navigate(jobDetailPath(selected.id), {
                        state: { fromFeed: `${location.pathname}${location.search}` },
                      });
                    }}
                    onSave={handleRecommendedSave}
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
