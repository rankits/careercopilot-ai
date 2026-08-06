import { Link as RouterLink } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';
import type { JobCardData } from '@/components/molecules';

import { mapRecommendationDtoToCard } from '@/features/recommendations/hooks/useRecommendations';

import { ROUTES } from '@/constants/routes';
import type { RecommendationFeedbackAction } from '@/features/recommendations/types/recommendation.types';
import { Box, CircularProgress, MenuItem, TextField, Typography } from '@/lib/material';

import { getPanelId, getTabId } from '../../utils';
import { RecommendationJobList } from '../RecommendationJobList';

type FeedbackAction = Extract<
  RecommendationFeedbackAction,
  'DISMISSED' | 'NOT_RELEVANT' | 'MORE_LIKE_THIS' | 'LESS_LIKE_THIS'
>;

type ResumeRecommendationsPanelProps = {
  resumeProfile: {
    isPending: boolean;
    isError: boolean;
    isFetching: boolean;
    error: unknown;
    refetch: () => unknown;
  };
  selectedResumeOption: Array<{ id: string; label: string }>;
  selectedResumeId: string;
  setSelectedResumeId: (id: string) => void;
  generateResumeError: string | null;
  generateResume: {
    isPending: boolean;
    isError: boolean;
    mutateAsync: (resumeId: string) => Promise<Parameters<typeof mapRecommendationDtoToCard>[0][]>;
  };
  setResumeGeneratedOnce: (value: boolean) => void;
  setResumeRecommendations: (cards: ReturnType<typeof mapRecommendationDtoToCard>[]) => void;
  resumeGeneratedOnce: boolean;
  visibleResumeRecommendations: ReturnType<typeof mapRecommendationDtoToCard>[];
  savedIdSet: Set<string>;
  moreLikeThisIds: Record<string, boolean>;
  onApply: (job: JobCardData) => void;
  onSave: (job: JobCardData) => void;
  onOpen: (job: JobCardData) => void;
  onFeedback: (recommendationId: string, action: FeedbackAction) => void;
};

export function ResumeRecommendationsPanel({
  resumeProfile,
  selectedResumeOption,
  selectedResumeId,
  setSelectedResumeId,
  generateResumeError,
  generateResume,
  setResumeGeneratedOnce,
  setResumeRecommendations,
  resumeGeneratedOnce,
  visibleResumeRecommendations,
  savedIdSet,
  moreLikeThisIds,
  onApply,
  onSave,
  onOpen,
  onFeedback,
}: ResumeRecommendationsPanelProps) {
  return (
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
          <RecommendationJobList
            ariaLabel="Resume recommendations"
            items={visibleResumeRecommendations}
            savedIdSet={savedIdSet}
            moreLikeThisIds={moreLikeThisIds}
            onApply={onApply}
            onSave={onSave}
            onOpen={onOpen}
            onFeedback={onFeedback}
          />
        </>
      ) : null}
    </Box>
  );
}
