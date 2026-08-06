import type { RecommendationReadinessStatus } from '@/features/recommendations/types/recommendation.types';

export type RecommendationLifecycleState = NonNullable<
  RecommendationReadinessStatus['lifecycleState']
>;

export const failedLifecycleStates = new Set<RecommendationLifecycleState>([
  'FAILED',
  'FAILED_TIMEOUT',
  'FAILED_PROVIDER',
  'FAILED_EMPTY',
]);

export const getFailureCopy = (state: RecommendationLifecycleState | undefined) => {
  switch (state) {
    case 'FAILED_TIMEOUT':
      return 'Recommendation generation timed out. Retry when you are ready.';
    case 'FAILED_PROVIDER':
      return 'The recommendation provider was unavailable. Retry to start a fresh run.';
    case 'FAILED_EMPTY':
      return 'No eligible jobs were found for the last run. Retry after updating your profile or job filters.';
    case 'FAILED':
      return 'The last recommendation run failed. Retry to start a fresh run.';
    default:
      return 'Unable to prepare recommendations. Retry to start a fresh run.';
  }
};
