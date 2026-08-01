import type { Logger } from 'pino';

export interface RecommendationGenerateMetricEvent {
  userId: string;
  runId?: string;
  candidateCount: number;
  durationMs: number;
  success: boolean;
  failureCode?: string;
  empty: boolean;
}

let generateCount = 0;
let emptyCount = 0;
let failureCount = 0;
let totalLatencyMs = 0;

export const recommendationMetricsSnapshot = () => ({
  generateCount,
  emptyCount,
  failureCount,
  averageLatencyMs: generateCount > 0 ? totalLatencyMs / generateCount : 0,
});

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
      failureCode: event.failureCode,
      empty: event.empty,
    },
    'Recommendation generation metric',
  );
};

export const resetRecommendationMetricsForTests = (): void => {
  generateCount = 0;
  emptyCount = 0;
  failureCount = 0;
  totalLatencyMs = 0;
};
