import type { Logger } from 'pino';
import type {
  RecommendationCategory,
  RecommendationFeedbackAction,
  RecommendationFilterMode,
} from '@/modules/recommendations/types/recommendations.types.js';

export interface RecommendationGenerateMetricEvent {
  userId: string;
  runId?: string;
  candidateCount: number;
  durationMs: number;
  success: boolean;
  filterMode?: RecommendationFilterMode;
  failureCode?: string;
  empty: boolean;
}

export interface RecommendationRerankMetricEvent {
  userId: string;
  runId?: string;
  candidateCount: number;
  durationMs: number;
  success: boolean;
  fallback: boolean;
}

let generateCount = 0;
let emptyCount = 0;
let failureCount = 0;
let totalLatencyMs = 0;
let filterCertExcludeTotal = 0;
let rerankSuccessCount = 0;
let rerankFailureCount = 0;
let rerankFallbackCount = 0;
let rerankTotalLatencyMs = 0;
let careerGoalApiTotal = 0;
let savedSearchApiTotal = 0;
let feedbackAppliedLinkedTotal = 0;
let feedbackMoreLessTotal = 0;
let recommendationInvalidationTotal = 0;
let careerCategoryDistribution: Record<RecommendationCategory, number> = {
  BEST_MATCH: 0,
  GOOD_MATCH: 0,
  STRETCH_OPPORTUNITY: 0,
  RELATED_CAREER_PATH: 0,
};
let feedbackActionTotal: Partial<Record<RecommendationFeedbackAction, number>> = {};

export const recommendationMetricsSnapshot = () => ({
  generateCount,
  emptyCount,
  failureCount,
  averageLatencyMs: generateCount > 0 ? totalLatencyMs / generateCount : 0,
  filterCertExcludeTotal,
  rerankSuccessCount,
  rerankFailureCount,
  rerankFallbackCount,
  rerankAverageLatencyMs:
    rerankSuccessCount + rerankFailureCount > 0
      ? rerankTotalLatencyMs / (rerankSuccessCount + rerankFailureCount)
      : 0,
  careerGoalApiTotal,
  savedSearchApiTotal,
  feedbackAppliedLinkedTotal,
  feedbackMoreLessTotal,
  recommendationInvalidationTotal,
  careerCategoryDistribution: { ...careerCategoryDistribution },
  feedbackActionTotal: { ...feedbackActionTotal },
});

export const recordCertificationFilterExclusion = (): void => {
  filterCertExcludeTotal += 1;
};

export const recordCareerGoalApiRequest = (): void => {
  careerGoalApiTotal += 1;
};

export const recordSavedSearchApiRequest = (): void => {
  savedSearchApiTotal += 1;
};

export const recordRecommendationInvalidation = (): void => {
  recommendationInvalidationTotal += 1;
};

export const recordCareerCategory = (category: RecommendationCategory): void => {
  careerCategoryDistribution[category] += 1;
};

export const recordFeedbackAction = (action: RecommendationFeedbackAction): void => {
  feedbackActionTotal[action] = (feedbackActionTotal[action] ?? 0) + 1;
  if (action === 'APPLIED') {
    feedbackAppliedLinkedTotal += 1;
  }
  if (action === 'MORE_LIKE_THIS' || action === 'LESS_LIKE_THIS') {
    feedbackMoreLessTotal += 1;
  }
};

export const recordRecommendationGenerate = (
  logger: Logger,
  event: RecommendationGenerateMetricEvent,
): void => {
  generateCount += 1;
  totalLatencyMs += event.durationMs;
  if (event.empty) emptyCount += 1;
  if (!event.success) failureCount += 1;

  logger.info(
    {
      metric: 'recommendation.generate',
      userId: event.userId,
      runId: event.runId,
      candidateCount: event.candidateCount,
      durationMs: event.durationMs,
      success: event.success,
      filterMode: event.filterMode,
      failureCode: event.failureCode,
      empty: event.empty,
    },
    'Recommendation generation metric',
  );
};

export const recordRecommendationRerank = (
  logger: Logger,
  event: RecommendationRerankMetricEvent,
): void => {
  rerankTotalLatencyMs += event.durationMs;
  if (event.success) rerankSuccessCount += 1;
  else rerankFailureCount += 1;
  if (event.fallback) rerankFallbackCount += 1;

  logger.info(
    {
      metric: 'recommendation.rerank',
      userId: event.userId,
      runId: event.runId,
      candidateCount: event.candidateCount,
      durationMs: event.durationMs,
      success: event.success,
      fallback: event.fallback,
    },
    'Recommendation rerank metric',
  );
};

export const resetRecommendationMetricsForTests = (): void => {
  generateCount = 0;
  emptyCount = 0;
  failureCount = 0;
  totalLatencyMs = 0;
  filterCertExcludeTotal = 0;
  rerankSuccessCount = 0;
  rerankFailureCount = 0;
  rerankFallbackCount = 0;
  rerankTotalLatencyMs = 0;
  careerGoalApiTotal = 0;
  savedSearchApiTotal = 0;
  feedbackAppliedLinkedTotal = 0;
  feedbackMoreLessTotal = 0;
  recommendationInvalidationTotal = 0;
  careerCategoryDistribution = {
    BEST_MATCH: 0,
    GOOD_MATCH: 0,
    STRETCH_OPPORTUNITY: 0,
    RELATED_CAREER_PATH: 0,
  };
  feedbackActionTotal = {};
};
