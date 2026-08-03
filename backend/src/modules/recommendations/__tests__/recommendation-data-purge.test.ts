import { beforeEach, describe, expect, it, vi } from 'vitest';
import { purgeUserRecommendationData } from '@/modules/recommendations/services/recommendation-lifecycle.service.js';
import {
  recommendationMetricsSnapshot,
  resetRecommendationMetricsForTests,
} from '@/modules/recommendations/observability/recommendation.metrics.js';

const mockDeleteManyFeedback = vi.fn().mockResolvedValue({ count: 4 });
const mockDeleteManyRecommendations = vi.fn().mockResolvedValue({ count: 12 });
const mockDeleteManyRuns = vi.fn().mockResolvedValue({ count: 2 });
const mockDeleteManyEmbeddings = vi.fn().mockResolvedValue({ count: 3 });

vi.mock('@/shared/config/db.conf.js', () => ({
  prisma: {
    $transaction: vi.fn(async (queries: unknown[]) => Promise.all(queries)),
    recommendationFeedback: {
      deleteMany: (...args: unknown[]) => mockDeleteManyFeedback(...args),
    },
    jobRecommendation: {
      deleteMany: (...args: unknown[]) => mockDeleteManyRecommendations(...args),
    },
    recommendationRun: {
      deleteMany: (...args: unknown[]) => mockDeleteManyRuns(...args),
    },
    candidateEmbedding: {
      deleteMany: (...args: unknown[]) => mockDeleteManyEmbeddings(...args),
    },
  },
}));

vi.mock('@/modules/recommendations/cache/recommendation-query-embedding.cache.js', () => ({
  invalidateUserQueryEmbeddings: vi.fn().mockResolvedValue(undefined),
}));

describe('JRE-SEC-003 Recommendation Data Purge Suite', () => {
  beforeEach(() => {
    resetRecommendationMetricsForTests();
    vi.clearAllMocks();
  });

  it('purges runs, recommendations, feedback, and candidate embeddings for user and increments metric', async () => {
    const result = await purgeUserRecommendationData('user-delete-123');

    expect(result).toEqual({
      deletedFeedback: 4,
      deletedRecommendations: 12,
      deletedRuns: 2,
      deletedCandidateEmbeddings: 3,
    });

    expect(mockDeleteManyFeedback).toHaveBeenCalledWith({
      where: { userId: 'user-delete-123' },
    });
    expect(mockDeleteManyRecommendations).toHaveBeenCalledWith({
      where: { userId: 'user-delete-123' },
    });
    expect(mockDeleteManyRuns).toHaveBeenCalledWith({
      where: { userId: 'user-delete-123' },
    });
    expect(mockDeleteManyEmbeddings).toHaveBeenCalledWith({
      where: { userId: 'user-delete-123' },
    });

    expect(recommendationMetricsSnapshot().userRecommendationPurgeTotal).toBe(1);
  });

  it('skips database deletion and returns zero counts for empty or whitespace userId', async () => {
    const result = await purgeUserRecommendationData('   ');

    expect(result).toEqual({
      deletedRuns: 0,
      deletedRecommendations: 0,
      deletedFeedback: 0,
      deletedCandidateEmbeddings: 0,
    });
    expect(mockDeleteManyRuns).not.toHaveBeenCalled();
    expect(recommendationMetricsSnapshot().userRecommendationPurgeTotal).toBe(0);
  });
});
