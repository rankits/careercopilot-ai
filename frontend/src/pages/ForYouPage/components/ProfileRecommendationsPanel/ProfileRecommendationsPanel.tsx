import { Link as RouterLink } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';
import type { JobCardData } from '@/components/molecules';

import { ROUTES } from '@/constants/routes';
import type { RecommendationFeedbackAction } from '@/features/recommendations/types/recommendation.types';
import { Alert, Box, CircularProgress, Typography } from '@/lib/material';

import {
  getFailureCopy,
  getPanelId,
  getTabId,
  type RecommendationLifecycleState,
} from '../../utils';
import { RecommendationJobList } from '../RecommendationJobList';

type FeedbackAction = Extract<
  RecommendationFeedbackAction,
  'DISMISSED' | 'NOT_RELEVANT' | 'MORE_LIKE_THIS' | 'LESS_LIKE_THIS'
>;

type ProfileRecommendationsPanelProps = {
  readiness: {
    isError: boolean;
    isFetching: boolean;
    refetch: () => unknown;
  };
  isStale: boolean;
  isProcessingLifecycle: boolean;
  isFailedLifecycle: boolean;
  isEmbeddingPending: boolean;
  lifecycleState: RecommendationLifecycleState | undefined;
  profileActionPending: boolean;
  refreshProfile: {
    isPending: boolean;
    mutateAsync: () => Promise<unknown>;
  };
  canGenerate: boolean;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  isFetching: boolean;
  refetch: () => unknown;
  isEmpty: boolean;
  visibleCards: JobCardData[];
  showProfileIncomplete: boolean;
  showProfileMissing: boolean;
  generatedOnce: boolean;
  setGeneratedOnce: (value: boolean) => void;
  generateError: string | null;
  refreshError: string | null;
  generate: {
    isPending: boolean;
    mutateAsync: () => Promise<unknown>;
  };
  data:
    | {
        total?: number;
        page?: number;
        totalPages?: number;
        hasPreviousPage?: boolean;
        hasNextPage?: boolean;
      }
    | undefined;
  page: number;
  setPage: (updater: (p: number) => number) => void;
  savedIdSet: Set<string>;
  moreLikeThisIds: Record<string, boolean>;
  onApply: (job: JobCardData) => void;
  onSave: (job: JobCardData) => void;
  onOpen: (job: JobCardData) => void;
  onFeedback: (recommendationId: string, action: FeedbackAction) => void;
};

export function ProfileRecommendationsPanel({
  readiness,
  isStale,
  isProcessingLifecycle,
  isFailedLifecycle,
  isEmbeddingPending,
  lifecycleState,
  profileActionPending,
  refreshProfile,
  canGenerate,
  isPending,
  isError,
  error,
  isFetching,
  refetch,
  isEmpty,
  visibleCards,
  showProfileIncomplete,
  showProfileMissing,
  generatedOnce,
  setGeneratedOnce,
  generateError,
  refreshError,
  generate,
  data,
  page,
  setPage,
  savedIdSet,
  moreLikeThisIds,
  onApply,
  onSave,
  onOpen,
  onFeedback,
}: ProfileRecommendationsPanelProps) {
  return (
    <>
      {readiness.isError ? (
        <Alert role="alert" severity="warning">
          Could not load recommendation readiness. You can still browse saved recommendations below.
        </Alert>
      ) : null}

      {isStale ? (
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

      {isProcessingLifecycle ? (
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

      {isFailedLifecycle ? (
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

      {isEmbeddingPending ? (
        <Alert role="status" severity="warning">
          Job embedding index is still warming up. Results may be limited until indexing completes.
        </Alert>
      ) : null}

      {isPending ? (
        <Box
          aria-labelledby={getTabId('profile')}
          id={getPanelId('profile')}
          role="tabpanel"
          sx={{ display: 'grid', placeItems: 'center', py: 8 }}
        >
          <CircularProgress aria-label="Loading recommendations" />
        </Box>
      ) : null}

      {isError ? (
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

      {!isPending && !isError && (isEmpty || visibleCards.length > 0) ? (
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
              <RecommendationJobList
                ariaLabel="For you recommendations"
                items={visibleCards}
                savedIdSet={savedIdSet}
                moreLikeThisIds={moreLikeThisIds}
                onApply={onApply}
                onSave={onSave}
                onOpen={onOpen}
                onFeedback={onFeedback}
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
    </>
  );
}
