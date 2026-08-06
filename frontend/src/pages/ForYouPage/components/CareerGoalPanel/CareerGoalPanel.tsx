import { Button } from '@/components/atoms/Button';
import type { JobCardData } from '@/components/molecules';

import { mapRecommendationDtoToCard } from '@/features/recommendations/hooks/useRecommendations';

import type {
  RecommendationDto,
  RecommendationFeedbackAction,
} from '@/features/recommendations/types/recommendation.types';
import { formatRecommendationCategoryLabel } from '@/features/recommendations/utils/formatRecommendationMatchLabel';
import { Box, TextField, Typography } from '@/lib/material';

import { CAREER_GOAL_MAX_LENGTH, careerCategoryCopy, getPanelId, getTabId } from '../../utils';
import { RecommendationJobList } from '../RecommendationJobList';

type FeedbackAction = Extract<
  RecommendationFeedbackAction,
  'DISMISSED' | 'NOT_RELEVANT' | 'MORE_LIKE_THIS' | 'LESS_LIKE_THIS'
>;

type CareerGoalPanelProps = {
  careerGoalText: string;
  setCareerGoalText: (value: string) => void;
  trimmedCareerGoalText: string;
  careerGoalTooLong: boolean;
  generateCareerError: string | null;
  generateCareerGoal: {
    isPending: boolean;
    isError: boolean;
    mutateAsync: (goal: string) => Promise<RecommendationDto[]>;
  };
  setCareerGeneratedOnce: (value: boolean) => void;
  setCareerRecommendations: (items: RecommendationDto[]) => void;
  careerGeneratedOnce: boolean;
  careerRecommendationsLength: number;
  visibleCareerRecommendationsLength: number;
  careerGroups: ReadonlyArray<readonly [string, RecommendationDto[]]>;
  savedIdSet: Set<string>;
  moreLikeThisIds: Record<string, boolean>;
  onApply: (job: JobCardData) => void;
  onSave: (job: JobCardData) => void;
  onOpen: (job: JobCardData) => void;
  onFeedback: (recommendationId: string, action: FeedbackAction) => void;
};

export function CareerGoalPanel({
  careerGoalText,
  setCareerGoalText,
  trimmedCareerGoalText,
  careerGoalTooLong,
  generateCareerError,
  generateCareerGoal,
  setCareerGeneratedOnce,
  setCareerRecommendations,
  careerGeneratedOnce,
  careerRecommendationsLength,
  visibleCareerRecommendationsLength,
  careerGroups,
  savedIdSet,
  moreLikeThisIds,
  onApply,
  onSave,
  onOpen,
  onFeedback,
}: CareerGoalPanelProps) {
  return (
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
      careerRecommendationsLength === 0 ? (
        <Typography role="status" sx={{ color: 'text.secondary', py: 2 }}>
          Enter a career goal to generate target, transition, stretch, and adjacent-path matches.
        </Typography>
      ) : null}

      {careerGeneratedOnce &&
      !generateCareerGoal.isPending &&
      !generateCareerGoal.isError &&
      visibleCareerRecommendationsLength === 0 ? (
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
          <RecommendationJobList
            ariaLabel={`${careerCategoryCopy[category] ?? category} career recommendations`}
            items={items.map((item, index) => mapRecommendationDtoToCard(item, index))}
            savedIdSet={savedIdSet}
            moreLikeThisIds={moreLikeThisIds}
            onApply={onApply}
            onSave={onSave}
            onOpen={onOpen}
            onFeedback={onFeedback}
          />
        </Box>
      ))}
    </Box>
  );
}
