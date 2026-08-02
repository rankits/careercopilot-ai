import { beforeEach, describe, expect, it } from 'vitest';
import pino from 'pino';
import {
  recordRecommendationGenerate,
  recordRetrievalBackendLatency,
  recordRecommendationCacheHit,
  recordRecommendationCacheMiss,
  recordFeedbackFunnelStep,
  recommendationMetricsSnapshot,
  resetRecommendationMetricsForTests,
} from '@/modules/recommendations/observability/recommendation.metrics.js';

const logger = pino({ enabled: false });

describe('recommendation.metrics', () => {
  beforeEach(() => {
    resetRecommendationMetricsForTests();
  });

  it('records generate failure counter and failure reason code', () => {
    recordRecommendationGenerate(logger, {
      userId: 'user-1',
      runId: 'run-1',
      candidateCount: 0,
      durationMs: 150,
      success: false,
      empty: true,
      failureCode: 'EMBEDDING_PROVIDER_UNAVAILABLE',
    });

    const snapshot = recommendationMetricsSnapshot();
    expect(snapshot.failureCount).toBe(1);
    expect(snapshot.failureCountByCode).toEqual({
      EMBEDDING_PROVIDER_UNAVAILABLE: 1,
    });
  });

  it('records successful generation without incrementing failure counter', () => {
    recordRecommendationGenerate(logger, {
      userId: 'user-1',
      runId: 'run-2',
      candidateCount: 10,
      durationMs: 250,
      success: true,
      empty: false,
    });

    const snapshot = recommendationMetricsSnapshot();
    expect(snapshot.generateCount).toBe(1);
    expect(snapshot.failureCount).toBe(0);
    expect(snapshot.failureCountByCode).toEqual({});
  });

  it('records retrieval backend latency histogram buckets (JRE-BE-003)', () => {
    recordRetrievalBackendLatency('PGVECTOR', 40);
    recordRetrievalBackendLatency('PGVECTOR', 180);
    recordRetrievalBackendLatency('DATABASE', 600);

    const snapshot = recommendationMetricsSnapshot();
    expect(snapshot.retrievalBackendLatencyHistogram.PGVECTOR.le_50).toBe(1);
    expect(snapshot.retrievalBackendLatencyHistogram.PGVECTOR.le_250).toBe(1);
    expect(snapshot.retrievalBackendLatencyHistogram.DATABASE.le_1000).toBe(1);
  });

  it('records cache hits, misses, and hit ratio (JRE-BE-003)', () => {
    recordRecommendationCacheHit(3);
    recordRecommendationCacheMiss(1);

    const snapshot = recommendationMetricsSnapshot();
    expect(snapshot.cacheHitsTotal).toBe(3);
    expect(snapshot.cacheMissesTotal).toBe(1);
    expect(snapshot.cacheHitRatio).toBe(0.75);
  });

  it('records feedback funnel steps (JRE-BE-003)', () => {
    recordFeedbackFunnelStep('IMPRESSION', 10);
    recordFeedbackFunnelStep('VIEW', 5);
    recordFeedbackFunnelStep('CLICK', 2);
    recordFeedbackFunnelStep('SAVE', 1);

    const snapshot = recommendationMetricsSnapshot();
    expect(snapshot.feedbackFunnel).toEqual({
      IMPRESSION: 10,
      VIEW: 5,
      CLICK: 2,
      SAVE: 1,
      APPLY: 0,
    });
  });
});
