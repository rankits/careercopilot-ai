import { describe, expect, it } from 'vitest';
import { RECOMMENDATION_ERROR_CODES } from '@/modules/recommendations/errors/recommendation.error.js';
import {
  isRecommendationSetStale,
  mapRecommendationLifecycleState,
} from '@/modules/recommendations/services/recommendation-readiness.helpers.js';
import type { RecommendationRunRecord } from '@/modules/recommendations/types/recommendations.types.js';

const run = (
  status: RecommendationRunRecord['status'],
  failureCode: string | null = null,
): RecommendationRunRecord => ({
  id: 'run-1',
  userId: 'user-1',
  sourceType: 'PROFILE',
  sourceId: null,
  status,
  candidateCount: 0,
  failureCode,
  createdAt: new Date('2026-08-02T00:00:00.000Z'),
  completedAt:
    status === 'COMPLETED' || status === 'FAILED' ? new Date('2026-08-02T00:01:00.000Z') : null,
});

describe('mapRecommendationLifecycleState', () => {
  it('maps absent and active run statuses to lifecycle states', () => {
    expect(mapRecommendationLifecycleState({ latestRun: null, stale: false })).toBe('NOT_STARTED');
    expect(mapRecommendationLifecycleState({ latestRun: run('PENDING'), stale: false })).toBe(
      'QUEUED',
    );
    expect(mapRecommendationLifecycleState({ latestRun: run('RETRIEVING'), stale: false })).toBe(
      'PROCESSING',
    );
    expect(mapRecommendationLifecycleState({ latestRun: run('SCORING'), stale: false })).toBe(
      'PROCESSING',
    );
  });

  it('maps completed runs to READY or STALE', () => {
    expect(mapRecommendationLifecycleState({ latestRun: run('COMPLETED'), stale: false })).toBe(
      'READY',
    );
    expect(mapRecommendationLifecycleState({ latestRun: run('COMPLETED'), stale: true })).toBe(
      'STALE',
    );
  });

  it('maps failure codes to specific failed lifecycle states', () => {
    expect(
      mapRecommendationLifecycleState({
        latestRun: run('FAILED', 'RECOMMENDATION_GENERATION_TIMEOUT'),
        stale: false,
      }),
    ).toBe('FAILED_TIMEOUT');
    expect(
      mapRecommendationLifecycleState({
        latestRun: run('FAILED', RECOMMENDATION_ERROR_CODES.EMBEDDING_PROVIDER_UNAVAILABLE),
        stale: false,
      }),
    ).toBe('FAILED_PROVIDER');
    expect(
      mapRecommendationLifecycleState({
        latestRun: run('FAILED', RECOMMENDATION_ERROR_CODES.NO_ELIGIBLE_JOBS_FOUND),
        stale: false,
      }),
    ).toBe('FAILED_EMPTY');
    expect(mapRecommendationLifecycleState({ latestRun: run('FAILED'), stale: false })).toBe(
      'FAILED',
    );
  });
});

describe('isRecommendationSetStale', () => {
  it('returns true when lastGeneratedAt exceeds TTL even if profile was not updated', async () => {
    const now = new Date('2026-08-05T12:00:00.000Z');
    const oldGenerate = new Date('2026-08-01T00:00:00.000Z'); // 4.5 days old
    const stale = await isRecommendationSetStale(
      { unitOfWork: {} as never, jobEmbeddings: {} as never },
      'user-1',
      oldGenerate,
      now,
    );
    expect(stale).toBe(true);
  });

  it('returns false when lastGeneratedAt is within TTL and profile was not updated', async () => {
    const now = new Date('2026-08-02T12:00:00.000Z');
    const recentGenerate = new Date('2026-08-02T00:00:00.000Z'); // 12 hours old
    const stale = await isRecommendationSetStale(
      {
        unitOfWork: {} as never,
        jobEmbeddings: {} as never,
        profileUpdatedAfter: async () => false,
      },
      'user-1',
      recentGenerate,
      now,
    );
    expect(stale).toBe(false);
  });
});
