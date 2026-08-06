import { useEffect } from 'react';

import { Box } from '@/lib/material';

import { CareerGoalPanel } from './components/CareerGoalPanel';
import { FeedbackNotice } from './components/FeedbackNotice';
import { ModeTabs } from './components/ModeTabs';
import { PageHeader } from './components/PageHeader';
import { ProfileRecommendationsPanel } from './components/ProfileRecommendationsPanel';
import { ResumeRecommendationsPanel } from './components/ResumeRecommendationsPanel';
import { SavedSearchPanel } from './components/SavedSearchPanel';
import { SimilarJobsPanel } from './components/SimilarJobsPanel';
import { TextRecommendationsPanel } from './components/TextRecommendationsPanel';
import { UnavailableModePanel } from './components/UnavailableModePanel';
import {
  useForYouMode,
  useForYouRecommendations,
  useRecommendationFeedbackActions,
  useRecommendedJobActions,
} from './hooks';
import { CAREER_GOAL_MAX_LENGTH, TARGET_TEXT_MAX_LENGTH } from './utils';

export function ForYouPage() {
  const {
    activeMode,
    activeModeMeta,
    similarSourceJobId,
    page,
    setPage,
    selectMode,
    handleModeTabKeyDown,
    modeTabRefs,
  } = useForYouMode();

  const {
    dismissedIds,
    moreLikeThisIds,
    feedbackNotice,
    setFeedbackNotice,
    trackRecommendationFeedback,
    submitFeedback,
  } = useRecommendationFeedbackActions();

  const {
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
  } = useForYouRecommendations({
    activeMode,
    page,
    similarSourceJobId,
    dismissedIds,
  });

  const { savedIdSet, handleRecommendedApply, handleRecommendedSave, handleRecommendedOpen } =
    useRecommendedJobActions({
      activeMode,
      similarSourceJobId,
      trackRecommendationFeedback,
    });

  useEffect(() => {
    for (const recommendationId of viewedRecommendationIds) {
      trackRecommendationFeedback(recommendationId, 'VIEWED');
    }
  }, [trackRecommendationFeedback, viewedRecommendationIds]);

  const targetTextTooLong = trimmedTargetText.length > TARGET_TEXT_MAX_LENGTH;
  const careerGoalTooLong = trimmedCareerGoalText.length > CAREER_GOAL_MAX_LENGTH;

  const jobListHandlers = {
    savedIdSet,
    moreLikeThisIds,
    onApply: handleRecommendedApply,
    onSave: handleRecommendedSave,
    onOpen: handleRecommendedOpen,
    onFeedback: submitFeedback,
  };

  return (
    <Box component="section" sx={{ display: 'grid', gap: 3, py: 2 }}>
      <PageHeader />

      <ModeTabs
        activeMode={activeMode}
        modeTabRefs={modeTabRefs}
        onSelectMode={selectMode}
        onKeyDown={handleModeTabKeyDown}
      />

      <FeedbackNotice notice={feedbackNotice} onClose={() => setFeedbackNotice(null)} />

      {activeMode === 'resume' ? (
        <ResumeRecommendationsPanel
          resumeProfile={resumeProfile}
          selectedResumeOption={selectedResumeOption}
          selectedResumeId={selectedResumeId}
          setSelectedResumeId={setSelectedResumeId}
          generateResumeError={generateResumeError}
          generateResume={generateResume}
          setResumeGeneratedOnce={setResumeGeneratedOnce}
          setResumeRecommendations={setResumeRecommendations}
          resumeGeneratedOnce={resumeGeneratedOnce}
          visibleResumeRecommendations={visibleResumeRecommendations}
          {...jobListHandlers}
        />
      ) : null}

      {activeMode === 'similar' ? (
        <SimilarJobsPanel
          similarSourceJobId={similarSourceJobId}
          similarJobs={similarJobs}
          similarCards={similarCards}
          savedIdSet={savedIdSet}
          onApply={handleRecommendedApply}
          onSave={handleRecommendedSave}
          onOpen={handleRecommendedOpen}
        />
      ) : null}

      {activeMode === 'career' ? (
        <CareerGoalPanel
          careerGoalText={careerGoalText}
          setCareerGoalText={setCareerGoalText}
          trimmedCareerGoalText={trimmedCareerGoalText}
          careerGoalTooLong={careerGoalTooLong}
          generateCareerError={generateCareerError}
          generateCareerGoal={generateCareerGoal}
          setCareerGeneratedOnce={setCareerGeneratedOnce}
          setCareerRecommendations={setCareerRecommendations}
          careerGeneratedOnce={careerGeneratedOnce}
          careerRecommendationsLength={careerRecommendations.length}
          visibleCareerRecommendationsLength={visibleCareerRecommendations.length}
          careerGroups={careerGroups}
          {...jobListHandlers}
        />
      ) : null}

      {activeMode === 'text-career' ? (
        <TextRecommendationsPanel
          targetText={targetText}
          setTargetText={setTargetText}
          trimmedTargetText={trimmedTargetText}
          targetTextTooLong={targetTextTooLong}
          generateTextError={generateTextError}
          generateText={generateText}
          setTextGeneratedOnce={setTextGeneratedOnce}
          setTextRecommendations={setTextRecommendations}
          textGeneratedOnce={textGeneratedOnce}
          visibleTextRecommendations={visibleTextRecommendations}
          {...jobListHandlers}
        />
      ) : null}

      {activeMode === 'saved' ? (
        <SavedSearchPanel
          savedSearches={savedSearches}
          savedSearchError={savedSearchError}
          savedSearchNotice={savedSearchNotice}
          setSavedSearchNotice={setSavedSearchNotice}
          savedSearchName={savedSearchName}
          setSavedSearchName={setSavedSearchName}
          savedSearchQueryText={savedSearchQueryText}
          setSavedSearchQueryText={setSavedSearchQueryText}
          trimmedSavedSearchName={trimmedSavedSearchName}
          trimmedSavedSearchQuery={trimmedSavedSearchQuery}
          createSavedSearch={createSavedSearch}
          setSelectedSavedSearchId={setSelectedSavedSearchId}
          savedSearchesList={savedSearchesList}
          selectedSavedSearchId={selectedSavedSearchId}
          selectedSavedSearch={selectedSavedSearch}
          generateSavedSearch={generateSavedSearch}
          deleteSavedSearch={deleteSavedSearch}
          setSavedSearchGeneratedOnce={setSavedSearchGeneratedOnce}
          setSavedSearchRecommendations={setSavedSearchRecommendations}
          savedSearchGeneratedOnce={savedSearchGeneratedOnce}
          visibleSavedSearchRecommendations={visibleSavedSearchRecommendations}
          {...jobListHandlers}
        />
      ) : null}

      {activeMode !== 'profile' &&
      activeMode !== 'resume' &&
      activeMode !== 'similar' &&
      activeMode !== 'career' &&
      activeMode !== 'saved' &&
      activeMode !== 'text-career' ? (
        <UnavailableModePanel
          activeMode={activeMode}
          panelLabel={activeModeMeta.panelLabel}
          onViewProfileMatches={() => selectMode('profile')}
        />
      ) : null}

      {activeMode === 'profile' ? (
        <ProfileRecommendationsPanel
          readiness={readiness}
          isStale={isStale}
          isProcessingLifecycle={isProcessingLifecycle}
          isFailedLifecycle={isFailedLifecycle}
          isEmbeddingPending={Boolean(isEmbeddingPending)}
          lifecycleState={lifecycleState}
          profileActionPending={profileActionPending}
          refreshProfile={refreshProfile}
          canGenerate={canGenerate}
          isPending={isPending}
          isError={isError}
          error={error}
          isFetching={isFetching}
          refetch={refetch}
          isEmpty={isEmpty}
          visibleCards={visibleCards}
          showProfileIncomplete={showProfileIncomplete}
          showProfileMissing={showProfileMissing}
          generatedOnce={generatedOnce}
          setGeneratedOnce={setGeneratedOnce}
          generateError={generateError}
          refreshError={refreshError}
          generate={generate}
          data={data}
          page={page}
          setPage={setPage}
          {...jobListHandlers}
        />
      ) : null}
    </Box>
  );
}
