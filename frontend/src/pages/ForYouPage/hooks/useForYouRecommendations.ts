import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import type { mapRecommendationDtoToCard } from '@/features/recommendations/hooks/useRecommendations';
import {
  useCreateSavedSearch,
  useDeleteSavedSearch,
  useGenerateCareerGoalRecommendations,
  useGenerateRecommendations,
  useGenerateResumeRecommendations,
  useGenerateSavedSearchRecommendations,
  useGenerateTextRecommendations,
  useRefreshProfileRecommendations,
  useRecommendationReadiness,
  useRecommendations,
  useSavedSearches,
  useSimilarJobs,
} from '@/features/recommendations/hooks/useRecommendations';
import { useAppSelector } from '@/hooks/redux';

import type { RecommendationDto } from '@/features/recommendations/types/recommendation.types';
import { resumeService } from '@/features/resume/services/resume.service';

import {
  failedLifecycleStates,
  groupCareerRecommendations,
  type RecommendationMode,
} from '../utils';

export function useForYouRecommendations({
  activeMode,
  page,
  similarSourceJobId,
  dismissedIds,
}: {
  activeMode: RecommendationMode;
  page: number;
  similarSourceJobId: string | undefined;
  dismissedIds: Record<string, boolean>;
}) {
  const isProfileComplete = useAppSelector((state) => state.auth.isProfileComplete);
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
  const resumeProfile = useQuery({
    queryKey: ['resume', 'profile', 'me'],
    queryFn: () => resumeService.getMyProfile(),
    enabled: activeMode === 'resume',
  });
  const similarJobs = useSimilarJobs(similarSourceJobId, {
    enabled: activeMode === 'similar' && Boolean(similarSourceJobId),
    limit: 20,
  });
  const savedSearches = useSavedSearches({ enabled: activeMode === 'saved' });

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
  const trimmedCareerGoalText = careerGoalText.trim();
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

  return {
    readiness,
    data,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
    generate,
    refreshProfile,
    generateResume,
    generateText,
    generateCareerGoal,
    createSavedSearch,
    deleteSavedSearch,
    generateSavedSearch,
    resumeProfile,
    similarJobs,
    savedSearches,
    generatedOnce,
    setGeneratedOnce,
    resumeGeneratedOnce,
    setResumeGeneratedOnce,
    textGeneratedOnce,
    setTextGeneratedOnce,
    careerGeneratedOnce,
    setCareerGeneratedOnce,
    selectedResumeId,
    setSelectedResumeId,
    targetText,
    setTargetText,
    careerGoalText,
    setCareerGoalText,
    savedSearchName,
    setSavedSearchName,
    savedSearchQueryText,
    setSavedSearchQueryText,
    selectedSavedSearchId,
    setSelectedSavedSearchId,
    savedSearchGeneratedOnce,
    setSavedSearchGeneratedOnce,
    savedSearchNotice,
    setSavedSearchNotice,
    setResumeRecommendations,
    setTextRecommendations,
    setCareerRecommendations,
    setSavedSearchRecommendations,
    visibleCards,
    showProfileIncomplete,
    showProfileMissing,
    isEmpty,
    isStale,
    isEmbeddingPending,
    canGenerate,
    lifecycleState,
    isProcessingLifecycle,
    isFailedLifecycle,
    profileActionPending,
    generateError,
    refreshError,
    generateResumeError,
    generateTextError,
    generateCareerError,
    savedSearchError,
    similarCards,
    selectedResumeOption,
    trimmedTargetText,
    trimmedCareerGoalText,
    trimmedSavedSearchName,
    trimmedSavedSearchQuery,
    savedSearchesList,
    selectedSavedSearch,
    visibleResumeRecommendations,
    visibleTextRecommendations,
    visibleCareerRecommendations,
    visibleSavedSearchRecommendations,
    careerGroups,
    viewedRecommendationIds,
    careerRecommendations,
  };
}
