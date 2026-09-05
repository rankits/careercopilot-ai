import Box from '@mui/material/Box';

import type { JobCardData } from '@/components/molecules';
import { JobCard } from '@/components/molecules/JobCard';

import type { RecommendationFeedbackAction } from '@/features/recommendations/types/recommendation.types';

type FeedbackAction = Extract<
  RecommendationFeedbackAction,
  'DISMISSED' | 'NOT_RELEVANT' | 'MORE_LIKE_THIS' | 'LESS_LIKE_THIS'
>;

export interface RecommendationJobListProps {
  ariaLabel: string;
  items: JobCardData[];
  savedIdSet: Set<string>;
  moreLikeThisIds: Record<string, boolean>;
  onApply: (job: JobCardData) => void;
  onSave: (job: JobCardData) => void;
  onOpen: (job: JobCardData) => void;
  onFeedback: (recommendationId: string, action: FeedbackAction) => void;
}

export function RecommendationJobList({
  ariaLabel,
  items,
  savedIdSet,
  moreLikeThisIds,
  onApply,
  onSave,
  onOpen,
  onFeedback,
}: RecommendationJobListProps) {
  return (
    <Box
      aria-label={ariaLabel}
      component="ul"
      sx={{ display: 'grid', gap: 2, listStyle: 'none', m: 0, p: 0 }}
    >
      {items.map((job) => (
        <Box component="li" key={job.recommendationId ?? job.id ?? `${job.company}-${job.title}`}>
          <JobCard
            job={job}
            isSaved={Boolean(job.id && savedIdSet.has(job.id))}
            isMoreLikeThis={Boolean(job.recommendationId && moreLikeThisIds[job.recommendationId])}
            onApply={onApply}
            onSave={onSave}
            onOpen={onOpen}
            onDismiss={
              job.recommendationId
                ? (selected) =>
                    onFeedback(selected.recommendationId ?? job.recommendationId!, 'DISMISSED')
                : undefined
            }
            onNotRelevant={
              job.recommendationId
                ? (selected) =>
                    onFeedback(selected.recommendationId ?? job.recommendationId!, 'NOT_RELEVANT')
                : undefined
            }
            onMoreLikeThis={
              job.recommendationId
                ? (selected) =>
                    onFeedback(selected.recommendationId ?? job.recommendationId!, 'MORE_LIKE_THIS')
                : undefined
            }
            onLessLikeThis={
              job.recommendationId
                ? (selected) =>
                    onFeedback(selected.recommendationId ?? job.recommendationId!, 'LESS_LIKE_THIS')
                : undefined
            }
          />
        </Box>
      ))}
    </Box>
  );
}
