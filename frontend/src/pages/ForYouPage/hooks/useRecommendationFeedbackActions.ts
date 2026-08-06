import { useCallback, useRef, useState } from 'react';

import { useRecommendationFeedback } from '@/features/recommendations/hooks/useRecommendations';

import type { RecommendationFeedbackAction } from '@/features/recommendations/types/recommendation.types';

export function useRecommendationFeedbackActions() {
  const feedback = useRecommendationFeedback();
  const trackedFeedbackKeys = useRef<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Record<string, boolean>>({});
  const [moreLikeThisIds, setMoreLikeThisIds] = useState<Record<string, boolean>>({});
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

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

  const submitFeedback = useCallback(
    (
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
    },
    [feedback],
  );

  return {
    dismissedIds,
    moreLikeThisIds,
    feedbackNotice,
    setFeedbackNotice,
    trackRecommendationFeedback,
    submitFeedback,
  };
}
