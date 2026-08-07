import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import BookmarkOutlinedIcon from '@mui/icons-material/BookmarkOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import TrackChangesOutlinedIcon from '@mui/icons-material/TrackChangesOutlined';
import TravelExploreOutlinedIcon from '@mui/icons-material/TravelExploreOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useQuery } from '@tanstack/react-query';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Link as RouterLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';
import {
  JobCard,
  JobFeedLoadingState,
  JobFeedStatus,
  VirtualizedJobList,
  type JobCardData,
} from '@/components/molecules';
import {
  FilterButton,
  FilterScrollButton,
  FilterShell,
  FilterTrack,
} from '@/components/molecules/JobFilterBar/styles';
import { useToast } from '@/components/organisms/Toast/ToastContext';

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

import { ANY_COUNTRY, findCountryOptionByName, getCountryOptions } from '@/constants/countries';
import {
  AI_MATCH_CAREER_PATHS,
  AI_MATCH_COPY,
  AI_MATCH_EXPERIENCE_OPTIONS,
  AI_MATCH_WORK_MODE_OPTIONS,
} from '@/constants/pages/aiMatch';
import { jobDetailPath, ROUTES } from '@/constants/routes';
import { JOB_FILTER_BAR_SCROLL } from '@/constants/ui';
import { applicationsService } from '@/features/applications/services/applications.service';
import { mapApplicationDtoToSavedJobCard } from '@/features/applications/utils/mapApplicationDtoToSavedJobCard';
import { pickLatestSimilarSourceJobId } from '@/features/applications/utils/pickLatestSimilarSourceJobId';
import { jobsService } from '@/features/jobs/services/jobs.service';
import { mapJobListDtoToCard } from '@/features/jobs/utils/mapJobToCard';
import { openExternalApply } from '@/features/jobs/utils/openExternalApply';
import type {
  RecommendationDto,
  RecommendationFeedbackAction,
  RecommendationReadinessStatus,
} from '@/features/recommendations/types/recommendation.types';
import { formatRecommendationCategoryLabel } from '@/features/recommendations/utils/formatRecommendationMatchLabel';
import { mapCareerPreferences } from '@/features/recommendations/utils/mapCareerPreferences';
import { resumeService } from '@/features/resume/services/resume.service';
import { jobFeedPageSx } from '@/pages/JobFeedPage/styles';

import { aiMatchPageSx } from './styles';

type RecommendationMode = 'profile' | 'resume' | 'similar' | 'text-career' | 'career' | 'saved';
type RecommendationLifecycleState = NonNullable<RecommendationReadinessStatus['lifecycleState']>;
type SavedView = string;

const TARGET_TEXT_MAX_LENGTH = 500;
const COMPACT_MODE_TABS_QUERY = '(max-width: 47.5rem)';
const MODE_TAB_SCROLL_STEP_RATIO = 0.75;
const DEFAULT_CAREER_EXPERIENCE = AI_MATCH_EXPERIENCE_OPTIONS[0];
const DEFAULT_CAREER_WORK_MODE = AI_MATCH_WORK_MODE_OPTIONS[0];
const CAREER_COUNTRY_OPTIONS = getCountryOptions();
const SIMILAR_SOURCE_CANDIDATES_QUERY_KEY = ['applications', 'similar-source-candidates'] as const;
const SIMILAR_AUTO_OFF_PARAM = 'similarAutoOff';
const BYTE_UNITS = ['B', 'KB', 'MB', 'GB'] as const;

interface ModeTabScrollState {
  canScrollLeft: boolean;
  canScrollRight: boolean;
}

const NO_MODE_TAB_SCROLL: ModeTabScrollState = {
  canScrollLeft: false,
  canScrollRight: false,
};

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

const sortByMatchDesc = <T extends { match?: number }>(items: readonly T[]): T[] =>
  [...items].sort((a, b) => (b.match ?? -1) - (a.match ?? -1));

const formatFileSize = (bytes: number | undefined): string => {
  if (!bytes || bytes <= 0) return '0 B';
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const precision = unitIndex === 0 || value >= 10 ? 0 : 1;
  return `${value.toFixed(precision)} ${BYTE_UNITS[unitIndex]}`;
};

const formatUploadedDate = (iso: string | null | undefined): string => {
  if (!iso) return 'an unknown date';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'an unknown date';
  return parsed.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

function AiMatchInfoBanner({
  action,
  icon,
  message,
  title,
}: {
  action?: ReactNode;
  icon: ReactNode;
  message: string;
  title?: string;
}) {
  return (
    <Box role="status" sx={aiMatchPageSx.banner}>
      <Box aria-hidden="true" sx={aiMatchPageSx.bannerIcon}>
        {icon}
      </Box>
      <Box sx={aiMatchPageSx.bannerCopy}>
        {title ? <Typography sx={aiMatchPageSx.bannerTitle}>{title}</Typography> : null}
        <Typography sx={aiMatchPageSx.bannerMessage}>{message}</Typography>
      </Box>
      {action ? <Box sx={aiMatchPageSx.bannerAction}>{action}</Box> : null}
    </Box>
  );
}

function SourceJobLogo({ initial }: { initial: string }) {
  return (
    <Box aria-hidden="true" component="span" sx={aiMatchPageSx.sourceJobLogo}>
      {initial}
    </Box>
  );
}

export function AiMatchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeMode = getModeFromSearchParams(searchParams);
  const similarSourceJobId = searchParams.get('jobId') || undefined;
  const similarAutoSourceSuppressed = searchParams.get(SIMILAR_AUTO_OFF_PARAM) === '1';
  const activeModeMeta =
    recommendationModes.find((mode) => mode.id === activeMode) ?? recommendationModes[0]!;
  const isProfileComplete = useAppSelector((state) => state.auth.isProfileComplete);
  const [page, setPage] = useState(1);
  const [generatedOnce, setGeneratedOnce] = useState(false);
  const [resumeGeneratedOnce, setResumeGeneratedOnce] = useState(false);
  const [textGeneratedOnce, setTextGeneratedOnce] = useState(false);
  const [careerGeneratedOnce, setCareerGeneratedOnce] = useState(false);
  const [targetText, setTargetText] = useState('');
  const [careerTargetRole, setCareerTargetRole] = useState('');
  const [careerPath, setCareerPath] = useState('');
  const [careerExperience, setCareerExperience] = useState<string>(DEFAULT_CAREER_EXPERIENCE);
  const [careerWorkMode, setCareerWorkMode] = useState<string>(DEFAULT_CAREER_WORK_MODE);
  const [careerCountry, setCareerCountry] = useState<string>(ANY_COUNTRY);
  const [savedSearchName, setSavedSearchName] = useState('');
  const [savedSearchQueryText, setSavedSearchQueryText] = useState('');
  const [selectedSavedView, setSelectedSavedView] = useState<SavedView>('all');
  const [showNewSavedSearchForm, setShowNewSavedSearchForm] = useState(false);
  const [savedSearchGeneratedOnce, setSavedSearchGeneratedOnce] = useState(false);
  const [savedSearchResultCounts, setSavedSearchResultCounts] = useState<Record<string, number>>(
    {},
  );
  const [savedSortOrder, setSavedSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [dismissedIds, setDismissedIds] = useState<Record<string, boolean>>({});
  const [moreLikeThisIds, setMoreLikeThisIds] = useState<Record<string, boolean>>({});
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
  const [modeTabScrollState, setModeTabScrollState] =
    useState<ModeTabScrollState>(NO_MODE_TAB_SCROLL);
  const [savedChipsScrollState, setSavedChipsScrollState] =
    useState<ModeTabScrollState>(NO_MODE_TAB_SCROLL);
  const isCompactModeTabs = useMediaQuery(COMPACT_MODE_TABS_QUERY);
  const modeTabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const modeTrackRef = useRef<HTMLDivElement | null>(null);
  const savedChipsTrackRef = useRef<HTMLDivElement | null>(null);
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
  const feedbackMutateAsyncRef = useRef(feedback.mutateAsync);
  feedbackMutateAsyncRef.current = feedback.mutateAsync;
  const { saveJob, unsaveJob } = useSaveJob();
  const resumeProfile = useQuery({
    queryKey: ['resume', 'profile', 'me'],
    queryFn: () => resumeService.getMyProfile(),
    enabled: activeMode === 'resume' || activeMode === 'career',
  });
  const resumesQuery = useQuery({
    queryKey: ['resumes', 'list'],
    queryFn: () => resumeService.listResumes(),
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
      activeMode === 'similar',
  });
  const similarSourceCandidatesQuery = useQuery({
    queryKey: SIMILAR_SOURCE_CANDIDATES_QUERY_KEY,
    queryFn: () => applicationsService.listSimilarSourceCandidates(),
    enabled: activeMode === 'similar',
  });
  const autoSimilarSourceJobId = useMemo(
    () => pickLatestSimilarSourceJobId(similarSourceCandidatesQuery.data ?? []),
    [similarSourceCandidatesQuery.data],
  );
  const similarJobs = useSimilarJobs(similarSourceJobId, {
    enabled: activeMode === 'similar' && Boolean(similarSourceJobId),
    limit: 20,
  });
  const sourceJobQuery = useQuery({
    queryKey: ['jobs', 'detail', similarSourceJobId ?? 'missing'],
    queryFn: ({ signal }) => jobsService.getJob(similarSourceJobId as string, { signal }),
    enabled: activeMode === 'similar' && Boolean(similarSourceJobId),
  });
  const savedSearches = useSavedSearches({ enabled: activeMode === 'saved' });
  const [optimisticSaved, setOptimisticSaved] = useState<Record<string, boolean>>({});

  const trackRecommendationFeedback = useCallback(
    (recommendationId: string | undefined, action: RecommendationFeedbackAction) => {
      if (!recommendationId) return;
      const key = `${action}:${recommendationId}`;
      if (trackedFeedbackKeys.current.has(key)) return;
      trackedFeedbackKeys.current.add(key);
      // An interaction should produce at most one feedback event while this page is mounted.
      void feedbackMutateAsyncRef.current({ recommendationId, action }).catch(() => undefined);
    },
    [],
  );

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
  const showEmbeddingWarning = Boolean(
    isEmbeddingPending && generatedOnce && isEmpty && !isProcessingLifecycle && !isFailedLifecycle,
  );
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
  const similarCards = sortByMatchDesc(similarJobs.data?.cards ?? []);
  const selectedResumeId = resumeProfile.data?.sourceResumeId ?? '';
  const selectedResumeFile = resumesQuery.data?.find((resume) => resume.id === selectedResumeId);
  const trimmedTargetText = targetText.trim();
  const targetTextTooLong = trimmedTargetText.length > TARGET_TEXT_MAX_LENGTH;
  const trimmedSavedSearchName = savedSearchName.trim();
  const trimmedSavedSearchQuery = savedSearchQueryText.trim();
  const savedSearchesList = savedSearches.data?.items ?? [];
  const selectedSavedSearch =
    selectedSavedView !== 'all'
      ? savedSearchesList.find((item) => item.id === selectedSavedView)
      : undefined;
  const visibleResumeRecommendations = useMemo(
    () =>
      sortByMatchDesc(
        resumeRecommendations.filter(
          (card) => !card.recommendationId || !dismissedIds[card.recommendationId],
        ),
      ),
    [dismissedIds, resumeRecommendations],
  );
  const visibleTextRecommendations = useMemo(
    () =>
      sortByMatchDesc(
        textRecommendations.filter(
          (card) => !card.recommendationId || !dismissedIds[card.recommendationId],
        ),
      ),
    [dismissedIds, textRecommendations],
  );
  const visibleCareerRecommendations = useMemo(
    () => careerRecommendations.filter((item) => !dismissedIds[item.id]),
    [careerRecommendations, dismissedIds],
  );
  const visibleSavedSearchRecommendations = sortByMatchDesc(
    savedSearchRecommendations.filter(
      (card) => !card.recommendationId || !dismissedIds[card.recommendationId],
    ),
  );
  const savedBookmarkCards = useMemo(() => {
    const items = (savedQuery.data ?? []).map((app, index) =>
      mapApplicationDtoToSavedJobCard(app, index),
    );
    const sorted = [...items].sort(
      (a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime(),
    );
    return savedSortOrder === 'newest' ? sorted.reverse() : sorted;
  }, [savedQuery.data, savedSortOrder]);
  const careerGroups = groupCareerRecommendations(visibleCareerRecommendations);

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
        showToast({
          severity: 'success',
          message:
            action === 'MORE_LIKE_THIS'
              ? 'Future matches will lean toward jobs like this.'
              : 'Future matches will avoid jobs like this.',
        });
      })
      .catch(() => {
        if (hidesCard) {
          setDismissedIds((prev) => ({ ...prev, [recommendationId]: false }));
        } else {
          setMoreLikeThisIds((prev) => ({ ...prev, [recommendationId]: false }));
        }
      });
  };

  const renderRecommendationJobCard = (job: JobCardData) => (
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
      isMoreLikeThis={Boolean(job.recommendationId && moreLikeThisIds[job.recommendationId])}
      onOpen={(selected) => {
        if (!selected.id) return;
        trackRecommendationFeedback(job.recommendationId, 'OPENED');
        void navigate(jobDetailPath(selected.id), {
          state: { fromFeed: `${location.pathname}${location.search}` },
        });
      }}
      onSave={handleRecommendedSave}
    />
  );

  const renderBookmarkJobCard = (job: JobCardData) => (
    <JobCard
      job={job}
      isSaved={Boolean(job.id && savedIdSet.has(job.id))}
      onApply={handleRecommendedApply}
      onOpen={(selected) => {
        if (!selected.id) return;
        void navigate(jobDetailPath(selected.id), {
          state: { fromFeed: `${location.pathname}${location.search}` },
        });
      }}
      onSave={handleRecommendedSave}
    />
  );

  const runGenerateResume = () => {
    if (!selectedResumeId) return;
    setResumeGeneratedOnce(true);
    void generateResume
      .mutateAsync(selectedResumeId)
      .then((items) => setResumeRecommendations(items.map(mapRecommendationDtoToCard)))
      .catch(() => undefined);
  };

  const runGenerateText = () => {
    if (!trimmedTargetText || targetTextTooLong) return;
    setTextGeneratedOnce(true);
    void generateText
      .mutateAsync(trimmedTargetText)
      .then((items) => setTextRecommendations(items.map(mapRecommendationDtoToCard)))
      .catch(() => undefined);
  };

  const buildCareerGoalText = (): string => {
    const segments: string[] = [];
    if (careerTargetRole.trim()) segments.push(`Target role: ${careerTargetRole.trim()}`);
    if (careerPath.trim()) segments.push(`Career path: ${careerPath.trim()}`);
    if (careerExperience !== DEFAULT_CAREER_EXPERIENCE) {
      segments.push(`Experience level: ${careerExperience}`);
    }
    const preferences = mapCareerPreferences(
      careerWorkMode as (typeof AI_MATCH_WORK_MODE_OPTIONS)[number],
      careerCountry,
    );
    for (const segment of preferences.goalTextSegments) {
      segments.push(segment);
    }
    return segments.length > 0
      ? `${segments.join('. ')}.`
      : 'Explore career opportunities aligned with my profile.';
  };

  const runGenerateCareerGoal = () => {
    const preferences = mapCareerPreferences(
      careerWorkMode as (typeof AI_MATCH_WORK_MODE_OPTIONS)[number],
      careerCountry,
    );
    setCareerGeneratedOnce(true);
    void generateCareerGoal
      .mutateAsync({
        goalText: buildCareerGoalText(),
        structured: {
          targetRole: careerTargetRole.trim(),
          careerLevel: careerExperience,
          locationScope: preferences.locationScope,
          locations: preferences.locations,
          ...(preferences.remotePreference
            ? { remotePreference: preferences.remotePreference }
            : {}),
          summary: careerPath.trim(),
          flexibilityMode: 'FLEXIBLE',
        },
      })
      .then((items) => setCareerRecommendations(items))
      .catch(() => undefined);
  };

  const handleSuggestCareerForMe = () => {
    const details = resumeProfile.data?.personalDetails ?? {};
    const suggestedTitle = typeof details.designation === 'string' ? details.designation : '';
    const suggestedLocationRaw = typeof details.location === 'string' ? details.location : '';
    const matchedCountry =
      findCountryOptionByName(suggestedLocationRaw) ??
      CAREER_COUNTRY_OPTIONS.find((option) =>
        suggestedLocationRaw.toLowerCase().includes(option.name.toLowerCase()),
      );

    if (suggestedTitle) setCareerTargetRole(suggestedTitle);
    if (matchedCountry) setCareerCountry(matchedCountry.name);

    showToast({
      message:
        suggestedTitle || matchedCountry
          ? 'Filled in suggestions from your profile.'
          : 'Complete your profile to get personalized suggestions.',
      severity: suggestedTitle || matchedCountry ? 'success' : 'info',
    });
  };

  const runGenerateSavedSearch = (savedSearchId: string) => {
    setSavedSearchGeneratedOnce(true);
    void generateSavedSearch
      .mutateAsync(savedSearchId)
      .then((items) => {
        setSavedSearchRecommendations(items.map(mapRecommendationDtoToCard));
        setSavedSearchResultCounts((prev) => ({ ...prev, [savedSearchId]: items.length }));
      })
      .catch(() => undefined);
  };

  const clearSimilarSource = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('jobId');
    nextParams.set(SIMILAR_AUTO_OFF_PARAM, '1');
    setSearchParams(nextParams);
  };

  useEffect(() => {
    if (activeMode !== 'similar') {
      return;
    }

    if (similarSourceJobId || similarAutoSourceSuppressed || !autoSimilarSourceJobId) {
      return;
    }

    if (similarSourceCandidatesQuery.isPending) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('mode', 'similar');
    nextParams.set('jobId', autoSimilarSourceJobId);
    nextParams.delete(SIMILAR_AUTO_OFF_PARAM);
    setSearchParams(nextParams, { replace: true });
  }, [
    activeMode,
    autoSimilarSourceJobId,
    searchParams,
    setSearchParams,
    similarAutoSourceSuppressed,
    similarSourceCandidatesQuery.isPending,
    similarSourceJobId,
  ]);

  const resolvingSimilarSource =
    activeMode === 'similar' &&
    !similarSourceJobId &&
    !similarAutoSourceSuppressed &&
    (similarSourceCandidatesQuery.isPending || Boolean(autoSimilarSourceJobId));

  const showSimilarPickSourceEmpty =
    activeMode === 'similar' &&
    !similarSourceJobId &&
    !similarSourceCandidatesQuery.isPending &&
    (similarAutoSourceSuppressed || !autoSimilarSourceJobId);

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
      nextParams.delete(SIMILAR_AUTO_OFF_PARAM);
    } else if (!nextParams.get('jobId')) {
      nextParams.delete(SIMILAR_AUTO_OFF_PARAM);
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

  const updateModeTabScrollState = useCallback(() => {
    const track = modeTrackRef.current;
    if (!track) {
      setModeTabScrollState(NO_MODE_TAB_SCROLL);
      return;
    }

    const maxScrollLeft = track.scrollWidth - track.clientWidth;
    setModeTabScrollState({
      canScrollLeft: track.scrollLeft > JOB_FILTER_BAR_SCROLL.edgeThresholdPx,
      canScrollRight: track.scrollLeft < maxScrollLeft - JOB_FILTER_BAR_SCROLL.edgeThresholdPx,
    });
  }, []);

  useEffect(() => {
    const track = modeTrackRef.current;
    if (!track) return;

    updateModeTabScrollState();
    track.addEventListener('scroll', updateModeTabScrollState, { passive: true });

    const resizeObserver = new ResizeObserver(() => updateModeTabScrollState());
    resizeObserver.observe(track);

    return () => {
      track.removeEventListener('scroll', updateModeTabScrollState);
      resizeObserver.disconnect();
    };
  }, [updateModeTabScrollState]);

  const scrollModeTabsByDirection = (direction: -1 | 1) => {
    const track = modeTrackRef.current;
    if (!track) return;
    const amount = Math.max(
      track.clientWidth * MODE_TAB_SCROLL_STEP_RATIO,
      JOB_FILTER_BAR_SCROLL.minStepPx,
    );
    track.scrollBy({ behavior: 'smooth', left: direction * amount });
  };

  const updateSavedChipsScrollState = useCallback(() => {
    const track = savedChipsTrackRef.current;
    if (!track) {
      setSavedChipsScrollState(NO_MODE_TAB_SCROLL);
      return;
    }

    const maxScrollLeft = track.scrollWidth - track.clientWidth;
    setSavedChipsScrollState({
      canScrollLeft: track.scrollLeft > JOB_FILTER_BAR_SCROLL.edgeThresholdPx,
      canScrollRight: track.scrollLeft < maxScrollLeft - JOB_FILTER_BAR_SCROLL.edgeThresholdPx,
    });
  }, []);

  useEffect(() => {
    if (activeMode !== 'saved') return;

    const track = savedChipsTrackRef.current;
    if (!track) return;

    updateSavedChipsScrollState();
    track.addEventListener('scroll', updateSavedChipsScrollState, { passive: true });

    const resizeObserver = new ResizeObserver(() => updateSavedChipsScrollState());
    resizeObserver.observe(track);

    return () => {
      track.removeEventListener('scroll', updateSavedChipsScrollState);
      resizeObserver.disconnect();
    };
  }, [activeMode, savedSearchesList.length, updateSavedChipsScrollState]);

  const scrollSavedChipsByDirection = (direction: -1 | 1) => {
    const track = savedChipsTrackRef.current;
    if (!track) return;
    const amount = Math.max(
      track.clientWidth * MODE_TAB_SCROLL_STEP_RATIO,
      JOB_FILTER_BAR_SCROLL.minStepPx,
    );
    track.scrollBy({ behavior: 'smooth', left: direction * amount });
  };

  const sourceJobCard = sourceJobQuery.data ? mapJobListDtoToCard(sourceJobQuery.data) : undefined;

  return (
    <Box component="section" sx={aiMatchPageSx.root}>
      <Box sx={aiMatchPageSx.header}>
        <Box aria-hidden="true" sx={aiMatchPageSx.headerIcon}>
          <AutoAwesomeOutlinedIcon fontSize="medium" />
        </Box>
        <Box sx={aiMatchPageSx.headerCopy}>
          <Typography component="h1" sx={aiMatchPageSx.title}>
            {AI_MATCH_COPY.title}
          </Typography>
          <Typography sx={aiMatchPageSx.subtitle}>{AI_MATCH_COPY.subtitle}</Typography>
        </Box>
      </Box>

      <FilterShell>
        {isCompactModeTabs ? (
          <FilterScrollButton
            aria-label={AI_MATCH_COPY.scrollModesLeftAria}
            disabled={!modeTabScrollState.canScrollLeft}
            onClick={() => scrollModeTabsByDirection(-1)}
            type="button"
          >
            <ChevronLeftIcon fontSize="small" />
          </FilterScrollButton>
        ) : null}

        <FilterTrack aria-label={AI_MATCH_COPY.modeTabsAria} ref={modeTrackRef} role="tablist">
          {recommendationModes.map((mode, index) => {
            const isActive = mode.id === activeMode;

            return (
              <FilterButton
                active={isActive}
                aria-controls={getPanelId(mode.id)}
                aria-selected={isActive}
                id={getTabId(mode.id)}
                key={mode.id}
                onKeyDown={(event) => handleModeTabKeyDown(event, index)}
                onClick={() => selectMode(mode.id)}
                ref={(element: HTMLButtonElement | null) => {
                  modeTabRefs.current[index] = element;
                }}
                role="tab"
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
              </FilterButton>
            );
          })}
        </FilterTrack>

        {isCompactModeTabs ? (
          <FilterScrollButton
            aria-label={AI_MATCH_COPY.scrollModesRightAria}
            disabled={!modeTabScrollState.canScrollRight}
            onClick={() => scrollModeTabsByDirection(1)}
            type="button"
          >
            <ChevronRightIcon fontSize="small" />
          </FilterScrollButton>
        ) : null}
      </FilterShell>

      {activeMode === 'resume' ? (
        <Box
          aria-labelledby={getTabId('resume')}
          id={getPanelId('resume')}
          role="tabpanel"
          sx={aiMatchPageSx.panel}
        >
          {resumeProfile.isPending ? (
            <JobFeedLoadingState label={AI_MATCH_COPY.loadingResume} />
          ) : null}

          {resumeProfile.isError ? (
            <JobFeedStatus
              message={
                resumeProfile.error instanceof Error
                  ? resumeProfile.error.message
                  : 'Unable to load your resume profile.'
              }
              onRetry={resumeProfile.isFetching ? undefined : () => void resumeProfile.refetch()}
              title={AI_MATCH_COPY.loadResumeErrorTitle}
              tone="error"
            />
          ) : null}

          {!resumeProfile.isPending && !resumeProfile.isError && !selectedResumeId ? (
            <Box role="status" sx={aiMatchPageSx.empty}>
              <Box aria-hidden="true" sx={aiMatchPageSx.emptyIcon}>
                <DescriptionOutlinedIcon fontSize="medium" />
              </Box>
              <Typography component="h2" sx={aiMatchPageSx.emptyTitle}>
                {AI_MATCH_COPY.resumeEmptyTitle}
              </Typography>
              <Typography sx={aiMatchPageSx.emptyDescription}>
                {AI_MATCH_COPY.resumeEmptyDescription}
              </Typography>
              <Box sx={aiMatchPageSx.emptyActions}>
                <Button component={RouterLink} size="small" to={ROUTES.PROFILE} variant="outline">
                  {AI_MATCH_COPY.addResume}
                </Button>
              </Box>
            </Box>
          ) : null}

          {!resumeProfile.isPending && !resumeProfile.isError && selectedResumeId ? (
            <>
              <AiMatchInfoBanner
                action={
                  <Button
                    disabled={generateResume.isPending}
                    isLoading={generateResume.isPending}
                    onClick={runGenerateResume}
                    size="small"
                    startIcon={<AutoAwesomeOutlinedIcon fontSize="small" />}
                  >
                    {AI_MATCH_COPY.generateMatches}
                  </Button>
                }
                icon={<DescriptionOutlinedIcon fontSize="small" />}
                message={AI_MATCH_COPY.resumeBanner}
              />

              {generateResumeError ? (
                <Typography role="alert" sx={{ color: 'error.main' }}>
                  {generateResumeError}
                </Typography>
              ) : null}

              <Typography component="h2" sx={aiMatchPageSx.sectionTitle}>
                {AI_MATCH_COPY.resumeSectionTitle}
              </Typography>
              <Box sx={aiMatchPageSx.resumeFileCard}>
                <Box aria-hidden="true" sx={aiMatchPageSx.resumeFileIcon}>
                  <PictureAsPdfOutlinedIcon fontSize="medium" />
                </Box>
                <Box sx={aiMatchPageSx.resumeFileCopy}>
                  <Typography sx={aiMatchPageSx.resumeFileName}>
                    {selectedResumeFile?.originalName ?? AI_MATCH_COPY.confirmedResume}{' '}
                    <VerifiedUserOutlinedIcon
                      aria-label={AI_MATCH_COPY.confirmedResume}
                      fontSize="inherit"
                    />
                  </Typography>
                  {selectedResumeFile ? (
                    <Typography sx={aiMatchPageSx.resumeFileMeta}>
                      {AI_MATCH_COPY.resumeMeta(
                        formatUploadedDate(selectedResumeFile.uploadedAt),
                        formatFileSize(selectedResumeFile.sizeBytes),
                      )}
                    </Typography>
                  ) : null}
                </Box>
                <Box sx={aiMatchPageSx.resumeFileActions}>
                  <Button component={RouterLink} size="small" to={ROUTES.PROFILE} variant="outline">
                    {AI_MATCH_COPY.replaceResume}
                  </Button>
                </Box>
              </Box>

              {!resumeGeneratedOnce ? (
                <Box role="status" sx={aiMatchPageSx.dashedEmpty}>
                  <Box aria-hidden="true" sx={aiMatchPageSx.dashedEmptyArt}>
                    <DescriptionOutlinedIcon fontSize="inherit" />
                  </Box>
                  <Typography component="h2" sx={aiMatchPageSx.dashedEmptyTitle}>
                    {AI_MATCH_COPY.resumeEmptyPending}
                  </Typography>
                  <Button
                    disabled={generateResume.isPending}
                    isLoading={generateResume.isPending}
                    onClick={runGenerateResume}
                    size="small"
                    startIcon={<AutoAwesomeOutlinedIcon fontSize="small" />}
                  >
                    {AI_MATCH_COPY.generateMatches}
                  </Button>
                </Box>
              ) : null}

              {resumeGeneratedOnce &&
              !generateResume.isPending &&
              !generateResume.isError &&
              visibleResumeRecommendations.length === 0 ? (
                <Box role="status" sx={aiMatchPageSx.empty}>
                  <Box aria-hidden="true" sx={aiMatchPageSx.emptyIcon}>
                    <DescriptionOutlinedIcon fontSize="medium" />
                  </Box>
                  <Typography component="h2" sx={aiMatchPageSx.emptyTitle}>
                    {AI_MATCH_COPY.emptyAfterGenerateTitle}
                  </Typography>
                  <Typography sx={aiMatchPageSx.emptyDescription}>
                    {AI_MATCH_COPY.resumeEmptyAfterGenerate}
                  </Typography>
                  <Box sx={aiMatchPageSx.emptyActions}>
                    <Button
                      component={RouterLink}
                      size="small"
                      to={ROUTES.JOB_FEED}
                      variant="outline"
                    >
                      {AI_MATCH_COPY.browseJobs}
                    </Button>
                  </Box>
                </Box>
              ) : null}

              {visibleResumeRecommendations.length > 0 ? (
                <>
                  <Box sx={aiMatchPageSx.listHeader}>
                    <Typography aria-live="polite" sx={aiMatchPageSx.resultCount}>
                      {AI_MATCH_COPY.resumeResultCount(visibleResumeRecommendations.length)}
                    </Typography>
                  </Box>
                  <Box sx={jobFeedPageSx.list}>
                    <VirtualizedJobList
                      ariaLabel="Resume recommendations"
                      getKey={(job) =>
                        job.recommendationId ?? job.id ?? `${job.company}-${job.title}`
                      }
                      items={visibleResumeRecommendations}
                      renderItem={renderRecommendationJobCard}
                    />
                  </Box>
                </>
              ) : null}
            </>
          ) : null}
        </Box>
      ) : null}

      {activeMode === 'similar' ? (
        <Box
          aria-labelledby={getTabId('similar')}
          id={getPanelId('similar')}
          role="tabpanel"
          sx={aiMatchPageSx.panel}
        >
          <AiMatchInfoBanner
            action={
              <Button
                disabled={!similarSourceJobId || similarJobs.isFetching}
                onClick={() => void similarJobs.refetch()}
                size="small"
                startIcon={<RefreshIcon fontSize="small" />}
                variant="outline"
              >
                {AI_MATCH_COPY.refresh}
              </Button>
            }
            icon={<PeopleOutlineIcon fontSize="small" />}
            message={AI_MATCH_COPY.similarBanner}
          />

          {similarSourceJobId && sourceJobCard ? (
            <Box sx={aiMatchPageSx.sourceJobCard}>
              <SourceJobLogo initial={sourceJobCard.logo} />
              <Box sx={aiMatchPageSx.sourceJobCopy}>
                <Typography sx={aiMatchPageSx.sourceJobLabel}>
                  {AI_MATCH_COPY.similarSourceLabel}
                </Typography>
                <Typography sx={aiMatchPageSx.sourceJobTitle}>{sourceJobCard.title}</Typography>
                <Typography sx={aiMatchPageSx.sourceJobMeta}>
                  {sourceJobCard.company}
                  {sourceJobCard.location ? ` • ${sourceJobCard.location}` : ''}
                </Typography>
              </Box>
              <Button onClick={clearSimilarSource} size="small" variant="outline">
                {AI_MATCH_COPY.similarChangeSource}
              </Button>
            </Box>
          ) : null}

          {!similarSourceJobId && resolvingSimilarSource ? (
            <JobFeedLoadingState label={AI_MATCH_COPY.loadingSimilarSource} />
          ) : null}

          {showSimilarPickSourceEmpty ? (
            <Box role="status" sx={aiMatchPageSx.empty}>
              <Box aria-hidden="true" sx={aiMatchPageSx.emptyIcon}>
                <SwapHorizOutlinedIcon fontSize="medium" />
              </Box>
              <Typography component="h2" sx={aiMatchPageSx.emptyTitle}>
                {AI_MATCH_COPY.similarEmptyTitle}
              </Typography>
              <Typography sx={aiMatchPageSx.emptyDescription}>
                {AI_MATCH_COPY.similarEmptyDescription}
              </Typography>
              <Box sx={aiMatchPageSx.emptyActions}>
                <Button component={RouterLink} size="small" to={ROUTES.JOB_FEED} variant="outline">
                  {AI_MATCH_COPY.similarBrowse}
                </Button>
              </Box>
            </Box>
          ) : null}

          {similarSourceJobId && similarJobs.isPending ? (
            <JobFeedLoadingState label={AI_MATCH_COPY.loadingSimilar} />
          ) : null}

          {similarSourceJobId && similarJobs.isError ? (
            <JobFeedStatus
              message={
                similarJobs.error instanceof Error
                  ? similarJobs.error.message
                  : 'Unable to load similar jobs.'
              }
              onRetry={similarJobs.isFetching ? undefined : () => void similarJobs.refetch()}
              title={AI_MATCH_COPY.loadSimilarErrorTitle}
              tone="error"
            />
          ) : null}

          {similarSourceJobId &&
          !similarJobs.isPending &&
          !similarJobs.isError &&
          similarCards.length === 0 ? (
            <Box role="status" sx={aiMatchPageSx.empty}>
              <Box aria-hidden="true" sx={aiMatchPageSx.emptyIcon}>
                <SwapHorizOutlinedIcon fontSize="medium" />
              </Box>
              <Typography component="h2" sx={aiMatchPageSx.emptyTitle}>
                {AI_MATCH_COPY.emptyAfterGenerateTitle}
              </Typography>
              <Typography sx={aiMatchPageSx.emptyDescription}>
                {AI_MATCH_COPY.similarEmpty}
              </Typography>
              <Box sx={aiMatchPageSx.emptyActions}>
                <Button component={RouterLink} size="small" to={ROUTES.JOB_FEED} variant="outline">
                  {AI_MATCH_COPY.browseJobs}
                </Button>
              </Box>
            </Box>
          ) : null}

          {similarSourceJobId && similarCards.length > 0 ? (
            <>
              <Box sx={aiMatchPageSx.listHeader}>
                <Typography aria-live="polite" sx={aiMatchPageSx.resultCount}>
                  {AI_MATCH_COPY.similarResultCount(similarCards.length)}
                </Typography>
              </Box>
              <Box sx={jobFeedPageSx.list}>
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
              </Box>
            </>
          ) : null}
        </Box>
      ) : null}

      {activeMode === 'career' ? (
        <Box
          aria-labelledby={getTabId('career')}
          id={getPanelId('career')}
          role="tabpanel"
          sx={aiMatchPageSx.panel}
        >
          <AiMatchInfoBanner
            icon={<TrackChangesOutlinedIcon fontSize="small" />}
            message={AI_MATCH_COPY.careerBanner}
          />

          <Box sx={aiMatchPageSx.careerComposerCard}>
            <Box sx={aiMatchPageSx.careerFormGrid}>
              <TextField
                fullWidth
                label={AI_MATCH_COPY.careerTargetLabel}
                onChange={(event) => setCareerTargetRole(event.target.value)}
                placeholder={AI_MATCH_COPY.careerTargetPlaceholder}
                size="small"
                value={careerTargetRole}
              />
              <TextField
                fullWidth
                label={AI_MATCH_COPY.careerPathLabel}
                onChange={(event) => setCareerPath(event.target.value)}
                placeholder={AI_MATCH_COPY.careerPathPlaceholder}
                size="small"
                value={careerPath}
              />
              <Box sx={aiMatchPageSx.careerFormPreferences}>
                <TextField
                  fullWidth
                  label={AI_MATCH_COPY.careerExperienceLabel}
                  onChange={(event) => setCareerExperience(event.target.value)}
                  select
                  size="small"
                  value={careerExperience}
                >
                  {AI_MATCH_EXPERIENCE_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  fullWidth
                  label={AI_MATCH_COPY.careerWorkModeLabel}
                  onChange={(event) => setCareerWorkMode(event.target.value)}
                  select
                  size="small"
                  value={careerWorkMode}
                >
                  {AI_MATCH_WORK_MODE_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
                <Autocomplete
                  autoHighlight
                  disableClearable={careerCountry === ANY_COUNTRY}
                  fullWidth
                  getOptionLabel={(option) => option}
                  isOptionEqualToValue={(option, value) => option === value}
                  onChange={(_event, value) => setCareerCountry(value ?? ANY_COUNTRY)}
                  options={[ANY_COUNTRY, ...CAREER_COUNTRY_OPTIONS.map((option) => option.name)]}
                  renderInput={(params) => (
                    <TextField {...params} label={AI_MATCH_COPY.careerLocationLabel} size="small" />
                  )}
                  size="small"
                  value={careerCountry}
                />
              </Box>
            </Box>

            <Box sx={aiMatchPageSx.careerPathsSection}>
              <Typography component="h3" sx={aiMatchPageSx.composerHint}>
                {AI_MATCH_COPY.careerPopularTitle}
              </Typography>
              <Box
                aria-label={AI_MATCH_COPY.careerPopularTitle}
                role="group"
                sx={aiMatchPageSx.careerPathChips}
              >
                {AI_MATCH_CAREER_PATHS.map((path) => {
                  const isActive = careerPath === path;

                  return (
                    <Box
                      aria-pressed={isActive}
                      component="button"
                      key={path}
                      onClick={() => setCareerPath(path)}
                      sx={{
                        ...aiMatchPageSx.careerPathChip,
                        ...(isActive ? aiMatchPageSx.careerPathChipActive : {}),
                      }}
                      type="button"
                    >
                      {path}
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {generateCareerError ? (
              <Typography role="alert" sx={{ color: 'error.main' }}>
                {generateCareerError}
              </Typography>
            ) : null}

            <Box sx={aiMatchPageSx.careerComposerFooter}>
              <Button
                onClick={handleSuggestCareerForMe}
                size="small"
                startIcon={<AutoAwesomeOutlinedIcon fontSize="small" />}
                variant="outline"
              >
                {AI_MATCH_COPY.careerSuggestCta}
              </Button>
              <Button
                disabled={generateCareerGoal.isPending}
                isLoading={generateCareerGoal.isPending}
                onClick={runGenerateCareerGoal}
                size="small"
                startIcon={<AutoAwesomeOutlinedIcon fontSize="small" />}
              >
                {AI_MATCH_COPY.careerGenerate}
              </Button>
            </Box>
          </Box>

          <Box sx={aiMatchPageSx.careerPrivacy}>
            <LockOutlinedIcon fontSize="inherit" />
            {AI_MATCH_COPY.careerPrivacyNote}
          </Box>

          {!careerGeneratedOnce ? (
            <Box role="status" sx={aiMatchPageSx.dashedEmpty}>
              <Box aria-hidden="true" sx={aiMatchPageSx.dashedEmptyArt}>
                <TrackChangesOutlinedIcon fontSize="inherit" />
              </Box>
              <Typography component="h2" sx={aiMatchPageSx.dashedEmptyTitle}>
                {AI_MATCH_COPY.careerEmptyPending}
              </Typography>
            </Box>
          ) : null}

          {careerGeneratedOnce &&
          !generateCareerGoal.isPending &&
          !generateCareerGoal.isError &&
          visibleCareerRecommendations.length === 0 ? (
            <Box role="status" sx={aiMatchPageSx.empty}>
              <Box aria-hidden="true" sx={aiMatchPageSx.emptyIcon}>
                <TrackChangesOutlinedIcon fontSize="medium" />
              </Box>
              <Typography component="h2" sx={aiMatchPageSx.emptyTitle}>
                {AI_MATCH_COPY.emptyAfterGenerateTitle}
              </Typography>
              <Typography sx={aiMatchPageSx.emptyDescription}>
                No matching jobs were found for this career search. Try adjusting your target role
                or path.
              </Typography>
              <Box sx={aiMatchPageSx.emptyActions}>
                <Button component={RouterLink} size="small" to={ROUTES.JOB_FEED} variant="outline">
                  {AI_MATCH_COPY.browseJobs}
                </Button>
              </Box>
            </Box>
          ) : null}

          {visibleCareerRecommendations.length > 0 ? (
            <Box sx={aiMatchPageSx.listHeader}>
              <Typography aria-live="polite" sx={aiMatchPageSx.resultCount}>
                {AI_MATCH_COPY.careerResultCount(visibleCareerRecommendations.length)}
              </Typography>
            </Box>
          ) : null}

          {careerGroups.map(([category, items]) => (
            <Box component="section" key={category} sx={aiMatchPageSx.groupSection}>
              <Box sx={aiMatchPageSx.groupHeader}>
                <Typography component="h2" sx={aiMatchPageSx.groupTitle}>
                  {careerCategoryCopy[category] ?? formatRecommendationCategoryLabel(category)}
                </Typography>
                <Typography sx={aiMatchPageSx.groupMeta}>
                  {AI_MATCH_COPY.jobCount(items.length)}
                </Typography>
              </Box>
              <Box sx={jobFeedPageSx.list}>
                <VirtualizedJobList
                  ariaLabel={`${careerCategoryCopy[category] ?? category} career recommendations`}
                  getKey={(job) => job.recommendationId ?? job.id ?? `${job.company}-${job.title}`}
                  items={items.map((item, index) => mapRecommendationDtoToCard(item, index))}
                  renderItem={renderRecommendationJobCard}
                />
              </Box>
            </Box>
          ))}
        </Box>
      ) : null}

      {activeMode === 'text-career' ? (
        <Box
          aria-labelledby={getTabId('text-career')}
          id={getPanelId('text-career')}
          role="tabpanel"
          sx={aiMatchPageSx.panel}
        >
          <AiMatchInfoBanner
            icon={<StickyNote2OutlinedIcon fontSize="small" />}
            message={AI_MATCH_COPY.textBanner}
          />

          <Box sx={aiMatchPageSx.textComposerCard}>
            <TextField
              error={targetTextTooLong}
              fullWidth
              helperText={
                targetTextTooLong ? AI_MATCH_COPY.textTooLong(TARGET_TEXT_MAX_LENGTH) : undefined
              }
              label={AI_MATCH_COPY.textLabel}
              multiline
              minRows={4}
              onChange={(event) => setTargetText(event.target.value)}
              placeholder={AI_MATCH_COPY.textPlaceholder}
              value={targetText}
            />

            {generateTextError ? (
              <Typography role="alert" sx={{ color: 'error.main' }}>
                {generateTextError}
              </Typography>
            ) : null}

            <Box sx={aiMatchPageSx.textComposerFooter}>
              <Typography sx={aiMatchPageSx.charCount}>
                {trimmedTargetText.length.toLocaleString()} /{' '}
                {TARGET_TEXT_MAX_LENGTH.toLocaleString()}
              </Typography>
              <Box sx={aiMatchPageSx.textComposerActions}>
                <Button
                  disabled={!targetText}
                  onClick={() => setTargetText('')}
                  size="small"
                  variant="outline"
                >
                  {AI_MATCH_COPY.clear}
                </Button>
                <Button
                  disabled={!trimmedTargetText || targetTextTooLong || generateText.isPending}
                  isLoading={generateText.isPending}
                  onClick={runGenerateText}
                  size="small"
                  startIcon={<AutoAwesomeOutlinedIcon fontSize="small" />}
                >
                  {AI_MATCH_COPY.textGenerate}
                </Button>
              </Box>
            </Box>
          </Box>

          {!textGeneratedOnce ? (
            <Box role="status" sx={aiMatchPageSx.dashedEmpty}>
              <Box aria-hidden="true" sx={aiMatchPageSx.dashedEmptyArt}>
                <TravelExploreOutlinedIcon fontSize="inherit" />
              </Box>
              <Typography component="h2" sx={aiMatchPageSx.dashedEmptyTitle}>
                {AI_MATCH_COPY.textEmptyPending}
              </Typography>
            </Box>
          ) : null}

          {textGeneratedOnce &&
          !generateText.isPending &&
          !generateText.isError &&
          visibleTextRecommendations.length === 0 ? (
            <Box role="status" sx={aiMatchPageSx.empty}>
              <Box aria-hidden="true" sx={aiMatchPageSx.emptyIcon}>
                <StickyNote2OutlinedIcon fontSize="medium" />
              </Box>
              <Typography component="h2" sx={aiMatchPageSx.emptyTitle}>
                {AI_MATCH_COPY.emptyAfterGenerateTitle}
              </Typography>
              <Typography sx={aiMatchPageSx.emptyDescription}>
                {AI_MATCH_COPY.textEmptyAfterGenerate}
              </Typography>
              <Box sx={aiMatchPageSx.emptyActions}>
                <Button component={RouterLink} size="small" to={ROUTES.JOB_FEED} variant="outline">
                  {AI_MATCH_COPY.browseJobs}
                </Button>
              </Box>
            </Box>
          ) : null}

          {visibleTextRecommendations.length > 0 ? (
            <>
              <Box sx={aiMatchPageSx.listHeader}>
                <Typography aria-live="polite" sx={aiMatchPageSx.resultCount}>
                  {AI_MATCH_COPY.textResultCount(visibleTextRecommendations.length)}
                </Typography>
              </Box>
              <Box sx={jobFeedPageSx.list}>
                <VirtualizedJobList
                  ariaLabel="Text recommendations"
                  getKey={(job) => job.recommendationId ?? job.id ?? `${job.company}-${job.title}`}
                  items={visibleTextRecommendations}
                  renderItem={renderRecommendationJobCard}
                />
              </Box>
            </>
          ) : null}
        </Box>
      ) : null}

      {activeMode === 'saved' ? (
        <Box
          aria-labelledby={getTabId('saved')}
          id={getPanelId('saved')}
          role="tabpanel"
          sx={aiMatchPageSx.savedTabPanel}
        >
          <AiMatchInfoBanner
            action={
              <Button
                onClick={() => {
                  void savedSearches.refetch();
                  void savedQuery.refetch();
                }}
                size="small"
                startIcon={<RefreshIcon fontSize="small" />}
                variant="outline"
              >
                {AI_MATCH_COPY.refresh}
              </Button>
            }
            icon={<BookmarkOutlinedIcon fontSize="small" />}
            message={AI_MATCH_COPY.savedBanner}
          />

          {savedSearches.isError ? (
            <JobFeedStatus
              message={
                savedSearches.error instanceof Error
                  ? savedSearches.error.message
                  : 'Unable to load saved searches.'
              }
              onRetry={savedSearches.isFetching ? undefined : () => void savedSearches.refetch()}
              title={AI_MATCH_COPY.savedLoadErrorTitle}
              tone="error"
            />
          ) : null}

          {savedSearchError && !savedSearches.isError ? (
            <JobFeedStatus
              message={savedSearchError}
              title={AI_MATCH_COPY.savedActionErrorTitle}
              tone="error"
            />
          ) : null}

          <Box sx={aiMatchPageSx.savedChipsShell}>
            <Typography component="h2" sx={aiMatchPageSx.sectionTitle}>
              {AI_MATCH_COPY.savedSearchesTitle}
            </Typography>
            <FilterShell>
              {isCompactModeTabs ? (
                <FilterScrollButton
                  aria-label={AI_MATCH_COPY.scrollSavedSearchesLeftAria}
                  disabled={!savedChipsScrollState.canScrollLeft}
                  onClick={() => scrollSavedChipsByDirection(-1)}
                  type="button"
                >
                  <ChevronLeftIcon fontSize="small" />
                </FilterScrollButton>
              ) : null}

              <FilterTrack
                aria-label={AI_MATCH_COPY.savedSearchesTitle}
                ref={savedChipsTrackRef}
                role="group"
              >
                <Box
                  component="button"
                  onClick={() => {
                    setSelectedSavedView('all');
                    setShowNewSavedSearchForm(false);
                  }}
                  sx={{
                    ...aiMatchPageSx.savedChip,
                    ...(selectedSavedView === 'all' ? aiMatchPageSx.savedChipActive : {}),
                  }}
                  type="button"
                >
                  <Box
                    aria-hidden="true"
                    sx={{
                      ...aiMatchPageSx.savedChipIcon,
                      ...(selectedSavedView === 'all' ? aiMatchPageSx.savedChipIconActive : {}),
                    }}
                  >
                    <BookmarkOutlinedIcon fontSize="small" />
                  </Box>
                  <Typography sx={aiMatchPageSx.savedChipTitle}>
                    {AI_MATCH_COPY.allSavedJobs}
                  </Typography>
                  <Typography sx={aiMatchPageSx.savedChipMeta}>
                    {AI_MATCH_COPY.jobCount(savedBookmarkCards.length)}
                  </Typography>
                </Box>

                {savedSearchesList.map((search) => (
                  <Box
                    component="button"
                    key={search.id}
                    onClick={() => {
                      setSelectedSavedView(search.id);
                      setShowNewSavedSearchForm(false);
                      setSavedSearchGeneratedOnce(
                        Boolean(savedSearchResultCounts[search.id] !== undefined),
                      );
                    }}
                    sx={{
                      ...aiMatchPageSx.savedChip,
                      ...(selectedSavedView === search.id ? aiMatchPageSx.savedChipActive : {}),
                    }}
                    type="button"
                  >
                    <Box
                      aria-hidden="true"
                      sx={{
                        ...aiMatchPageSx.savedChipIcon,
                        ...(selectedSavedView === search.id
                          ? aiMatchPageSx.savedChipIconActive
                          : {}),
                      }}
                    >
                      <BookmarkOutlinedIcon fontSize="small" />
                    </Box>
                    <Typography sx={aiMatchPageSx.savedChipTitle}>{search.name}</Typography>
                    <Typography sx={aiMatchPageSx.savedChipMeta}>
                      {savedSearchResultCounts[search.id] !== undefined
                        ? AI_MATCH_COPY.jobCount(savedSearchResultCounts[search.id]!)
                        : search.query?.trim() || AI_MATCH_COPY.savedNoQuery}
                    </Typography>
                  </Box>
                ))}

                <Box
                  component="button"
                  onClick={() => {
                    setShowNewSavedSearchForm(true);
                    setSelectedSavedView('all');
                  }}
                  sx={{ ...aiMatchPageSx.savedChip, ...aiMatchPageSx.savedChipNew }}
                  type="button"
                >
                  <AddIcon fontSize="small" />
                  <Typography sx={aiMatchPageSx.savedChipTitle}>
                    {AI_MATCH_COPY.newSavedSearch}
                  </Typography>
                </Box>
              </FilterTrack>

              {isCompactModeTabs ? (
                <FilterScrollButton
                  aria-label={AI_MATCH_COPY.scrollSavedSearchesRightAria}
                  disabled={!savedChipsScrollState.canScrollRight}
                  onClick={() => scrollSavedChipsByDirection(1)}
                  type="button"
                >
                  <ChevronRightIcon fontSize="small" />
                </FilterScrollButton>
              ) : null}
            </FilterShell>

            {savedSearchesList.length === 0 ? (
              <Typography sx={aiMatchPageSx.composerHint}>
                {AI_MATCH_COPY.savedEmptyDescription}
              </Typography>
            ) : null}
          </Box>

          {selectedSavedView !== 'all' && selectedSavedSearch ? (
            <Box sx={aiMatchPageSx.savedSearchActions}>
              <Box sx={aiMatchPageSx.savedSearchActionsCopy}>
                <Typography sx={aiMatchPageSx.savedChipTitle}>
                  {selectedSavedSearch.name}
                </Typography>
                <Typography sx={aiMatchPageSx.savedQueryChip}>
                  {selectedSavedSearch.query || AI_MATCH_COPY.savedNoQuery}
                </Typography>
              </Box>
              <Box sx={aiMatchPageSx.savedSearchActionsButtons}>
                <Button
                  aria-label={AI_MATCH_COPY.rerunSavedSearchAria}
                  disabled={generateSavedSearch.isPending}
                  isLoading={generateSavedSearch.isPending}
                  onClick={() => runGenerateSavedSearch(selectedSavedSearch.id)}
                  size="small"
                  startIcon={<AutoAwesomeOutlinedIcon fontSize="small" />}
                >
                  {AI_MATCH_COPY.rerunSavedSearch}
                </Button>
                <Button
                  aria-label={AI_MATCH_COPY.deleteSavedSearchAria}
                  disabled={deleteSavedSearch.isPending}
                  isLoading={deleteSavedSearch.isPending}
                  onClick={() => {
                    const deletedId = selectedSavedSearch.id;
                    void deleteSavedSearch
                      .mutateAsync(deletedId)
                      .then(() => {
                        setSelectedSavedView('all');
                        setSavedSearchRecommendations([]);
                        setSavedSearchGeneratedOnce(false);
                        showToast({
                          message: AI_MATCH_COPY.savedDeleteToast,
                          severity: 'success',
                        });
                      })
                      .catch(() => undefined);
                  }}
                  size="small"
                  startIcon={<DeleteOutlineIcon fontSize="small" />}
                  variant="outline"
                >
                  {AI_MATCH_COPY.deleteSavedSearch}
                </Button>
              </Box>
            </Box>
          ) : null}

          {showNewSavedSearchForm || savedSearchesList.length === 0 ? (
            <Box sx={aiMatchPageSx.composer}>
              <Box sx={aiMatchPageSx.composerHeader}>
                <Typography component="h2" sx={aiMatchPageSx.composerTitle}>
                  {AI_MATCH_COPY.savedCreateTitle}
                </Typography>
                <Typography sx={aiMatchPageSx.composerDescription}>
                  {AI_MATCH_COPY.savedCreateHint}
                </Typography>
              </Box>

              <Box sx={aiMatchPageSx.savedCreateRow}>
                <TextField
                  label={AI_MATCH_COPY.savedNameLabel}
                  onChange={(event) => setSavedSearchName(event.target.value)}
                  placeholder={AI_MATCH_COPY.savedNamePlaceholder}
                  size="small"
                  value={savedSearchName}
                />
                <TextField
                  label={AI_MATCH_COPY.savedQueryLabel}
                  onChange={(event) => setSavedSearchQueryText(event.target.value)}
                  placeholder={AI_MATCH_COPY.savedQueryPlaceholder}
                  size="small"
                  value={savedSearchQueryText}
                />
                <Button
                  aria-label={AI_MATCH_COPY.createSavedSearchAria}
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
                        setSelectedSavedView(savedSearch.id);
                        setSavedSearchName('');
                        setSavedSearchQueryText('');
                        setSavedSearchRecommendations([]);
                        setSavedSearchGeneratedOnce(false);
                        setShowNewSavedSearchForm(false);
                        showToast({
                          message: AI_MATCH_COPY.savedCreateToast,
                          severity: 'success',
                        });
                      })
                      .catch(() => undefined);
                  }}
                  size="small"
                  startIcon={<AddIcon fontSize="small" />}
                >
                  {AI_MATCH_COPY.createSavedSearch}
                </Button>
              </Box>
            </Box>
          ) : null}

          {selectedSavedView === 'all' ? (
            <>
              {savedQuery.isPending ? <JobFeedLoadingState label="Loading saved jobs" /> : null}

              {savedQuery.isError ? (
                <JobFeedStatus
                  message={
                    savedQuery.error instanceof Error
                      ? savedQuery.error.message
                      : 'Unable to load saved jobs.'
                  }
                  onRetry={savedQuery.isFetching ? undefined : () => void savedQuery.refetch()}
                  title="Couldn't load saved jobs"
                  tone="error"
                />
              ) : null}

              {!savedQuery.isPending && !savedQuery.isError && savedBookmarkCards.length === 0 ? (
                <Box role="status" sx={aiMatchPageSx.empty}>
                  <Box aria-hidden="true" sx={aiMatchPageSx.emptyIcon}>
                    <DescriptionOutlinedIcon fontSize="medium" />
                  </Box>
                  <Typography component="h2" sx={aiMatchPageSx.emptyTitle}>
                    {AI_MATCH_COPY.savedEmptyBookmarks}
                  </Typography>
                  <Box sx={aiMatchPageSx.emptyActions}>
                    <Button
                      component={RouterLink}
                      size="small"
                      to={ROUTES.JOB_FEED}
                      variant="outline"
                    >
                      {AI_MATCH_COPY.browseJobs}
                    </Button>
                  </Box>
                </Box>
              ) : null}

              {savedBookmarkCards.length > 0 ? (
                <Box sx={aiMatchPageSx.savedJobsSection}>
                  <Box component="hr" sx={aiMatchPageSx.savedDivider} />
                  <Box sx={aiMatchPageSx.listHeader}>
                    <Typography aria-live="polite" sx={aiMatchPageSx.resultCount}>
                      {AI_MATCH_COPY.savedJobsCount(savedBookmarkCards.length)}
                    </Typography>
                    <Box sx={aiMatchPageSx.sortControl}>
                      <Typography
                        component="label"
                        htmlFor="saved-jobs-sort"
                        sx={aiMatchPageSx.sortLabel}
                      >
                        {AI_MATCH_COPY.sortByLabel}
                      </Typography>
                      <TextField
                        id="saved-jobs-sort"
                        onChange={(event) =>
                          setSavedSortOrder(event.target.value as 'newest' | 'oldest')
                        }
                        select
                        size="small"
                        sx={aiMatchPageSx.sortSelect}
                        value={savedSortOrder}
                      >
                        <MenuItem value="newest">{AI_MATCH_COPY.savedSortNewest}</MenuItem>
                        <MenuItem value="oldest">{AI_MATCH_COPY.savedSortOldest}</MenuItem>
                      </TextField>
                    </Box>
                  </Box>
                  <Box sx={jobFeedPageSx.list}>
                    <VirtualizedJobList
                      ariaLabel="Saved jobs"
                      getKey={(job) => job.applicationId ?? job.id ?? `${job.company}-${job.title}`}
                      items={savedBookmarkCards}
                      renderItem={renderBookmarkJobCard}
                    />
                  </Box>
                </Box>
              ) : null}
            </>
          ) : (
            <>
              {savedSearchGeneratedOnce &&
              !generateSavedSearch.isPending &&
              !generateSavedSearch.isError &&
              visibleSavedSearchRecommendations.length === 0 ? (
                <Box role="status" sx={aiMatchPageSx.empty}>
                  <Box aria-hidden="true" sx={aiMatchPageSx.emptyIcon}>
                    <InfoOutlinedIcon fontSize="medium" />
                  </Box>
                  <Typography component="h2" sx={aiMatchPageSx.emptyTitle}>
                    {AI_MATCH_COPY.emptyAfterGenerateTitle}
                  </Typography>
                  <Typography sx={aiMatchPageSx.emptyDescription}>
                    {AI_MATCH_COPY.savedEmptyAfterGenerate}
                  </Typography>
                  <Box sx={aiMatchPageSx.emptyActions}>
                    <Button
                      component={RouterLink}
                      size="small"
                      to={ROUTES.JOB_FEED}
                      variant="outline"
                    >
                      {AI_MATCH_COPY.browseJobs}
                    </Button>
                  </Box>
                </Box>
              ) : null}

              {visibleSavedSearchRecommendations.length > 0 ? (
                <>
                  <Box sx={aiMatchPageSx.listHeader}>
                    <Typography aria-live="polite" sx={aiMatchPageSx.resultCount}>
                      {AI_MATCH_COPY.savedResultCount(visibleSavedSearchRecommendations.length)}
                    </Typography>
                  </Box>
                  <Box sx={jobFeedPageSx.list}>
                    <VirtualizedJobList
                      ariaLabel="Saved search recommendations"
                      getKey={(job) =>
                        job.recommendationId ?? job.id ?? `${job.company}-${job.title}`
                      }
                      items={visibleSavedSearchRecommendations}
                      renderItem={renderRecommendationJobCard}
                    />
                  </Box>
                </>
              ) : null}
            </>
          )}
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
          sx={aiMatchPageSx.panel}
        >
          <Box role="status" sx={aiMatchPageSx.empty}>
            <Box aria-hidden="true" sx={aiMatchPageSx.emptyIcon}>
              <AutoAwesomeOutlinedIcon fontSize="medium" />
            </Box>
            <Typography component="h2" sx={aiMatchPageSx.emptyTitle}>
              {activeModeMeta.panelLabel}
            </Typography>
            <Typography sx={aiMatchPageSx.emptyDescription}>
              {AI_MATCH_COPY.modeComingSoon}
            </Typography>
            <Button onClick={() => selectMode('profile')} size="small" variant="outline">
              {AI_MATCH_COPY.viewProfileMatches}
            </Button>
          </Box>
        </Box>
      ) : null}

      {activeMode === 'profile' ? (
        <Box
          aria-labelledby={getTabId('profile')}
          id={getPanelId('profile')}
          role="tabpanel"
          sx={aiMatchPageSx.panel}
        >
          {readiness.isError ? (
            <Box role="status" sx={aiMatchPageSx.banner}>
              <Box aria-hidden="true" sx={aiMatchPageSx.bannerIcon}>
                <InfoOutlinedIcon fontSize="small" />
              </Box>
              <Typography sx={aiMatchPageSx.bannerMessage}>
                {AI_MATCH_COPY.readinessWarning}
              </Typography>
            </Box>
          ) : null}

          {isStale ? (
            <Box role="status" sx={aiMatchPageSx.banner}>
              <Box aria-hidden="true" sx={aiMatchPageSx.bannerIcon}>
                <InfoOutlinedIcon fontSize="small" />
              </Box>
              <Box sx={aiMatchPageSx.bannerCopy}>
                <Typography sx={aiMatchPageSx.bannerMessage}>
                  {AI_MATCH_COPY.staleDescription}
                </Typography>
              </Box>
              <Button
                disabled={profileActionPending}
                isLoading={refreshProfile.isPending}
                onClick={() => {
                  setGeneratedOnce(true);
                  void refreshProfile.mutateAsync().catch(() => undefined);
                }}
                size="small"
                startIcon={<RefreshIcon fontSize="small" />}
                variant="outline"
              >
                {AI_MATCH_COPY.refreshMatches}
              </Button>
            </Box>
          ) : null}

          {isProcessingLifecycle ? (
            <Box role="status" sx={aiMatchPageSx.banner}>
              <CircularProgress aria-label="Recommendations processing" size={22} />
              <Typography sx={aiMatchPageSx.bannerMessage}>
                {lifecycleState === 'QUEUED'
                  ? AI_MATCH_COPY.processingQueued
                  : AI_MATCH_COPY.processingRunning}
              </Typography>
              <Button
                disabled={readiness.isFetching}
                onClick={() => void readiness.refetch()}
                size="small"
                startIcon={<RefreshIcon fontSize="small" />}
                variant="outline"
              >
                {AI_MATCH_COPY.refreshStatus}
              </Button>
            </Box>
          ) : null}

          {isFailedLifecycle ? (
            <Box role="alert" sx={{ ...aiMatchPageSx.banner, ...aiMatchPageSx.bannerDanger }}>
              <Box
                aria-hidden="true"
                sx={{ ...aiMatchPageSx.bannerIcon, ...aiMatchPageSx.bannerIconDanger }}
              >
                <ErrorOutlineIcon fontSize="small" />
              </Box>
              <Box sx={aiMatchPageSx.bannerCopy}>
                <Typography sx={aiMatchPageSx.bannerMessage}>
                  {getFailureCopy(lifecycleState)}
                  {lifecycleState ? ` Code: ${lifecycleState}.` : ''}
                </Typography>
              </Box>
              <Button
                disabled={!canGenerate || profileActionPending}
                isLoading={refreshProfile.isPending}
                onClick={() => {
                  setGeneratedOnce(true);
                  void refreshProfile.mutateAsync().catch(() => undefined);
                }}
                size="small"
                startIcon={<RefreshIcon fontSize="small" />}
              >
                {AI_MATCH_COPY.retryRecommendations}
              </Button>
            </Box>
          ) : null}

          {showEmbeddingWarning ? (
            <Box role="status" sx={aiMatchPageSx.banner}>
              <Box aria-hidden="true" sx={aiMatchPageSx.bannerIcon}>
                <InfoOutlinedIcon fontSize="small" />
              </Box>
              <Typography sx={aiMatchPageSx.bannerMessage}>
                {AI_MATCH_COPY.embeddingWarning}
              </Typography>
            </Box>
          ) : null}

          {isPending ? <JobFeedLoadingState label={AI_MATCH_COPY.loading} /> : null}

          {isError ? (
            <JobFeedStatus
              message={error instanceof Error ? error.message : 'Unable to load recommendations.'}
              onRetry={isFetching ? undefined : () => void refetch()}
              title={AI_MATCH_COPY.loadErrorTitle}
              tone="error"
            />
          ) : null}

          {!isPending && !isError && isEmpty && showProfileIncomplete ? (
            <Box role="status" sx={aiMatchPageSx.empty}>
              <Box aria-hidden="true" sx={aiMatchPageSx.emptyIcon}>
                <PersonOutlineIcon fontSize="medium" />
              </Box>
              <Typography component="h2" sx={aiMatchPageSx.emptyTitle}>
                {AI_MATCH_COPY.completeProfileTitle}
              </Typography>
              <Typography sx={aiMatchPageSx.emptyDescription}>
                {AI_MATCH_COPY.completeProfileDescription}
              </Typography>
              <Button component={RouterLink} size="small" to={ROUTES.PROFILE} variant="outline">
                {AI_MATCH_COPY.completeProfile}
              </Button>
            </Box>
          ) : null}

          {!isPending && !isError && isEmpty && showProfileMissing ? (
            <Box role="status" sx={aiMatchPageSx.empty}>
              <Box aria-hidden="true" sx={aiMatchPageSx.emptyIcon}>
                <PersonOutlineIcon fontSize="medium" />
              </Box>
              <Typography component="h2" sx={aiMatchPageSx.emptyTitle}>
                {AI_MATCH_COPY.missingProfileTitle}
              </Typography>
              <Typography sx={aiMatchPageSx.emptyDescription}>
                {AI_MATCH_COPY.missingProfileDescription}
              </Typography>
              <Button component={RouterLink} size="small" to={ROUTES.PROFILE} variant="outline">
                {AI_MATCH_COPY.setUpProfile}
              </Button>
            </Box>
          ) : null}

          {!isPending &&
          !isError &&
          isEmpty &&
          canGenerate &&
          !showProfileIncomplete &&
          !showProfileMissing &&
          !isProcessingLifecycle &&
          !isFailedLifecycle ? (
            <Box role="status" sx={aiMatchPageSx.empty}>
              <Box aria-hidden="true" sx={aiMatchPageSx.emptyIcon}>
                <AutoAwesomeOutlinedIcon fontSize="medium" />
              </Box>
              <Typography component="h2" sx={aiMatchPageSx.emptyTitle}>
                {generatedOnce
                  ? AI_MATCH_COPY.emptyAfterGenerateTitle
                  : AI_MATCH_COPY.emptyGenerateTitle}
              </Typography>
              <Typography sx={aiMatchPageSx.emptyDescription}>
                {generatedOnce
                  ? AI_MATCH_COPY.emptyAfterGenerateDescription
                  : AI_MATCH_COPY.emptyGenerateDescription}
              </Typography>
              {generateError ? (
                <Typography role="alert" sx={{ color: 'error.main' }}>
                  {generateError}
                </Typography>
              ) : null}
              <Box sx={aiMatchPageSx.emptyActions}>
                <Button
                  disabled={profileActionPending}
                  isLoading={generate.isPending}
                  onClick={() => {
                    setGeneratedOnce(true);
                    void generate.mutateAsync().catch(() => undefined);
                  }}
                  size="small"
                  startIcon={<AutoAwesomeOutlinedIcon fontSize="small" />}
                >
                  {AI_MATCH_COPY.generate}
                </Button>
                <Button component={RouterLink} size="small" to={ROUTES.JOB_FEED} variant="outline">
                  {AI_MATCH_COPY.browseJobs}
                </Button>
              </Box>
            </Box>
          ) : null}

          {!isPending && !isError && visibleCards.length > 0 ? (
            <>
              <Box sx={aiMatchPageSx.listHeader}>
                <Typography aria-live="polite" sx={aiMatchPageSx.resultCount}>
                  {AI_MATCH_COPY.resultCount(data?.total ?? 0)}
                </Typography>
                <Button
                  disabled={profileActionPending || isProcessingLifecycle}
                  isLoading={refreshProfile.isPending}
                  onClick={() => {
                    setGeneratedOnce(true);
                    void refreshProfile.mutateAsync().catch(() => undefined);
                  }}
                  size="small"
                  startIcon={<RefreshIcon fontSize="small" />}
                  variant="outline"
                >
                  {AI_MATCH_COPY.refreshMatches}
                </Button>
              </Box>
              {generateError || refreshError ? (
                <Typography role="alert" sx={{ color: 'error.main' }}>
                  {generateError ?? refreshError}
                </Typography>
              ) : null}
              <Box sx={jobFeedPageSx.list}>
                <VirtualizedJobList
                  ariaLabel="AI Match recommendations"
                  getKey={(job) => job.recommendationId ?? job.id ?? `${job.company}-${job.title}`}
                  items={visibleCards}
                  renderItem={renderRecommendationJobCard}
                />
              </Box>
              {data?.hasPreviousPage || data?.hasNextPage || (data?.totalPages ?? 0) > 1 ? (
                <Box sx={aiMatchPageSx.pagination}>
                  <Button
                    disabled={!data?.hasPreviousPage || isFetching}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    size="small"
                    variant="outline"
                  >
                    {AI_MATCH_COPY.paginationPrevious}
                  </Button>
                  <Typography sx={aiMatchPageSx.pageLabel}>
                    Page {data?.page ?? page}
                    {data?.totalPages ? ` of ${data.totalPages}` : ''}
                  </Typography>
                  <Button
                    disabled={!data?.hasNextPage || isFetching}
                    onClick={() => setPage((p) => p + 1)}
                    size="small"
                    variant="outline"
                  >
                    {AI_MATCH_COPY.paginationNext}
                  </Button>
                </Box>
              ) : null}
            </>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
}
