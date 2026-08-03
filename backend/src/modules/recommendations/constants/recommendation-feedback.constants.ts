import type { RecommendationFeedbackAction } from '@/modules/recommendations/types/recommendations.types.js';

/** Feedback actions that exclude a job from future retrieval (JR-PROD-003). SAVED is intentionally omitted. */
export const RETRIEVAL_EXCLUSION_FEEDBACK_ACTIONS = [
  'DISMISSED',
  'NOT_RELEVANT',
  'LESS_LIKE_THIS',
  'APPLIED',
] as const satisfies readonly RecommendationFeedbackAction[];

export type RetrievalExclusionFeedbackAction =
  (typeof RETRIEVAL_EXCLUSION_FEEDBACK_ACTIONS)[number];

export const isRetrievalExclusionFeedback = (
  action: RecommendationFeedbackAction,
): action is RetrievalExclusionFeedbackAction =>
  (RETRIEVAL_EXCLUSION_FEEDBACK_ACTIONS as readonly string[]).includes(action);
