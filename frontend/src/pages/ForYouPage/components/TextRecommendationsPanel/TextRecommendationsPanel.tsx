import { Button } from '@/components/atoms/Button';
import type { JobCardData } from '@/components/molecules';

import { mapRecommendationDtoToCard } from '@/features/recommendations/hooks/useRecommendations';

import type {
  RecommendationDto,
  RecommendationFeedbackAction,
} from '@/features/recommendations/types/recommendation.types';
import { Box, TextField, Typography } from '@/lib/material';

import { getPanelId, getTabId, TARGET_TEXT_MAX_LENGTH } from '../../utils';
import { RecommendationJobList } from '../RecommendationJobList';

type FeedbackAction = Extract<
  RecommendationFeedbackAction,
  'DISMISSED' | 'NOT_RELEVANT' | 'MORE_LIKE_THIS' | 'LESS_LIKE_THIS'
>;

type TextRecommendationsPanelProps = {
  targetText: string;
  setTargetText: (value: string) => void;
  trimmedTargetText: string;
  targetTextTooLong: boolean;
  generateTextError: string | null;
  generateText: {
    isPending: boolean;
    isError: boolean;
    mutateAsync: (text: string) => Promise<RecommendationDto[]>;
  };
  setTextGeneratedOnce: (value: boolean) => void;
  setTextRecommendations: (cards: ReturnType<typeof mapRecommendationDtoToCard>[]) => void;
  textGeneratedOnce: boolean;
  visibleTextRecommendations: ReturnType<typeof mapRecommendationDtoToCard>[];
  savedIdSet: Set<string>;
  moreLikeThisIds: Record<string, boolean>;
  onApply: (job: JobCardData) => void;
  onSave: (job: JobCardData) => void;
  onOpen: (job: JobCardData) => void;
  onFeedback: (recommendationId: string, action: FeedbackAction) => void;
};

export function TextRecommendationsPanel({
  targetText,
  setTargetText,
  trimmedTargetText,
  targetTextTooLong,
  generateTextError,
  generateText,
  setTextGeneratedOnce,
  setTextRecommendations,
  textGeneratedOnce,
  visibleTextRecommendations,
  savedIdSet,
  moreLikeThisIds,
  onApply,
  onSave,
  onOpen,
  onFeedback,
}: TextRecommendationsPanelProps) {
  return (
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

      {!textGeneratedOnce && !generateText.isPending && visibleTextRecommendations.length === 0 ? (
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
          <RecommendationJobList
            ariaLabel="Text recommendations"
            items={visibleTextRecommendations}
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
