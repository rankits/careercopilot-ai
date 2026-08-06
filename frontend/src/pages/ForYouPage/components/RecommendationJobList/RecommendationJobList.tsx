import { JobCard, VirtualizedJobList, type JobCardData } from '@/components/molecules';

import type { RecommendationFeedbackAction } from '@/features/recommendations/types/recommendation.types';

const defaultGetKey = (job: JobCardData) =>
  job.recommendationId ?? job.id ?? `${job.company}-${job.title}`;

type FeedbackAction = Extract<
  RecommendationFeedbackAction,
  'DISMISSED' | 'NOT_RELEVANT' | 'MORE_LIKE_THIS' | 'LESS_LIKE_THIS'
>;

export type RecommendationJobListProps = {
  ariaLabel: string;
  items: JobCardData[];
  getKey?: (job: JobCardData) => string;
  savedIdSet: Set<string>;
  moreLikeThisIds?: Record<string, boolean>;
  showFeedbackActions?: boolean;
  onApply: (job: JobCardData) => void;
  onSave: (job: JobCardData) => void;
  onOpen: (job: JobCardData) => void;
  onFeedback?: (recommendationId: string, action: FeedbackAction) => void;
};

export function RecommendationJobList({
  ariaLabel,
  items,
  getKey = defaultGetKey,
  savedIdSet,
  moreLikeThisIds = {},
  showFeedbackActions = true,
  onApply,
  onSave,
  onOpen,
  onFeedback,
}: RecommendationJobListProps) {
  return (
    <VirtualizedJobList
      ariaLabel={ariaLabel}
      getKey={getKey}
      items={items}
      renderItem={(job) => (
        <JobCard
          job={job}
          isSaved={Boolean(job.id && savedIdSet.has(job.id))}
          onApply={onApply}
          onDismiss={
            showFeedbackActions && job.recommendationId && onFeedback
              ? (selected) => onFeedback(selected.recommendationId!, 'DISMISSED')
              : undefined
          }
          onNotRelevant={
            showFeedbackActions && job.recommendationId && onFeedback
              ? (selected) => onFeedback(selected.recommendationId!, 'NOT_RELEVANT')
              : undefined
          }
          onMoreLikeThis={
            showFeedbackActions && job.recommendationId && onFeedback
              ? (selected) => onFeedback(selected.recommendationId!, 'MORE_LIKE_THIS')
              : undefined
          }
          onLessLikeThis={
            showFeedbackActions && job.recommendationId && onFeedback
              ? (selected) => onFeedback(selected.recommendationId!, 'LESS_LIKE_THIS')
              : undefined
          }
          isMoreLikeThis={Boolean(
            showFeedbackActions && job.recommendationId && moreLikeThisIds[job.recommendationId],
          )}
          onOpen={onOpen}
          onSave={onSave}
        />
      )}
    />
  );
}
