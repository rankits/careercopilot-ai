import type { SavedSearch } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  recommendationMetricsSnapshot,
  resetRecommendationMetricsForTests,
} from '@/modules/recommendations/observability/recommendation.metrics.js';
import { SavedSearchService } from '@/modules/recommendations/services/saved-search.service.js';
import type { SavedSearchRepository } from '@/modules/recommendations/repositories/prisma-saved-search.repository.js';
import { RECOMMENDATION_ERROR_CODES } from '@/modules/recommendations/errors/recommendation.error.js';

const savedSearchId = '44444444-4444-4444-4444-444444444444';

const savedSearchRecord = (overrides: Partial<SavedSearch> = {}): SavedSearch => ({
  id: savedSearchId,
  userId: 'user-1',
  name: 'Remote TypeScript roles',
  query: 'TypeScript platform engineer',
  filters: { locations: ['Remote'] },
  context: { titles: ['Platform Engineer'] },
  createdAt: new Date('2026-08-02T00:00:00.000Z'),
  updatedAt: new Date('2026-08-02T00:00:01.000Z'),
  deletedAt: null,
  ...overrides,
});

const createRepository = (): SavedSearchRepository => ({
  findById: vi.fn(),
  findOwned: vi.fn(),
  listByUser: vi.fn(),
  create: vi.fn(),
  updateOwned: vi.fn(),
  softDeleteOwned: vi.fn(),
});

describe('SavedSearchService', () => {
  beforeEach(() => {
    resetRecommendationMetricsForTests();
  });

  it('lists, creates, updates, and deletes through an owner-scoped repository', async () => {
    const repository = createRepository();
    const service = new SavedSearchService(repository);
    vi.mocked(repository.listByUser).mockResolvedValue({
      items: [savedSearchRecord()],
      page: 1,
      limit: 20,
      total: 1,
    });
    vi.mocked(repository.create).mockResolvedValue(savedSearchRecord({ name: 'Created search' }));
    vi.mocked(repository.updateOwned).mockResolvedValue(
      savedSearchRecord({ name: 'Updated search' }),
    );
    vi.mocked(repository.softDeleteOwned).mockResolvedValue(true);

    await expect(service.list('user-1', { page: 1, limit: 20 })).resolves.toMatchObject({
      total: 1,
    });
    await expect(
      service.create('user-1', {
        name: 'Created search',
        query: null,
        filters: {},
      }),
    ).resolves.toMatchObject({ name: 'Created search' });
    await expect(
      service.update('user-1', savedSearchId, { name: 'Updated search' }),
    ).resolves.toMatchObject({ name: 'Updated search' });
    await expect(service.delete('user-1', savedSearchId)).resolves.toBeUndefined();

    expect(repository.listByUser).toHaveBeenCalledWith('user-1', { page: 1, limit: 20 });
    expect(repository.create).toHaveBeenCalledWith({
      userId: 'user-1',
      name: 'Created search',
      query: null,
      filters: {},
    });
    expect(repository.updateOwned).toHaveBeenCalledWith('user-1', savedSearchId, {
      name: 'Updated search',
    });
    expect(repository.softDeleteOwned).toHaveBeenCalledWith('user-1', savedSearchId);
    expect(recommendationMetricsSnapshot().savedSearchApiTotal).toBe(4);
  });

  it('returns the same 404 for missing and non-owned saved searches', async () => {
    const repository = createRepository();
    const service = new SavedSearchService(repository);
    vi.mocked(repository.findOwned).mockResolvedValue(null);
    vi.mocked(repository.updateOwned).mockResolvedValue(null);
    vi.mocked(repository.softDeleteOwned).mockResolvedValue(false);

    await expect(service.get('user-1', savedSearchId)).rejects.toMatchObject({
      statusCode: 404,
      code: RECOMMENDATION_ERROR_CODES.SOURCE_NOT_FOUND,
    });
    await expect(service.update('user-1', savedSearchId, { name: 'Updated' })).rejects.toMatchObject(
      {
        statusCode: 404,
        code: RECOMMENDATION_ERROR_CODES.SOURCE_NOT_FOUND,
      },
    );
    await expect(service.delete('user-1', savedSearchId)).rejects.toMatchObject({
      statusCode: 404,
      code: RECOMMENDATION_ERROR_CODES.SOURCE_NOT_FOUND,
    });
    expect(recommendationMetricsSnapshot().savedSearchApiTotal).toBe(3);
  });
});
