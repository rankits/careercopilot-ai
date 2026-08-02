import type { SavedSearch } from '@prisma/client';
import {
  RECOMMENDATION_ERROR_CODES,
  RecommendationError,
} from '@/modules/recommendations/errors/recommendation.error.js';
import { recordSavedSearchApiRequest } from '@/modules/recommendations/observability/recommendation.metrics.js';
import type {
  CreateSavedSearchInput,
  SavedSearchListPage,
  SavedSearchRepository,
  UpdateSavedSearchInput,
} from '@/modules/recommendations/repositories/prisma-saved-search.repository.js';

export class SavedSearchService {
  constructor(private readonly repository: SavedSearchRepository) {}

  list(userId: string, pagination: { page: number; limit: number }): Promise<SavedSearchListPage> {
    recordSavedSearchApiRequest();
    return this.repository.listByUser(userId, pagination);
  }

  async get(userId: string, id: string): Promise<SavedSearch> {
    recordSavedSearchApiRequest();
    const savedSearch = await this.repository.findOwned(userId, id);
    if (!savedSearch) throw this.notFound();
    return savedSearch;
  }

  create(userId: string, input: Omit<CreateSavedSearchInput, 'userId'>): Promise<SavedSearch> {
    recordSavedSearchApiRequest();
    return this.repository.create({ ...input, userId });
  }

  async update(
    userId: string,
    id: string,
    input: UpdateSavedSearchInput,
  ): Promise<SavedSearch> {
    recordSavedSearchApiRequest();
    const savedSearch = await this.repository.updateOwned(userId, id, input);
    if (!savedSearch) throw this.notFound();
    return savedSearch;
  }

  async delete(userId: string, id: string): Promise<void> {
    recordSavedSearchApiRequest();
    const deleted = await this.repository.softDeleteOwned(userId, id);
    if (!deleted) throw this.notFound();
  }

  private notFound(): RecommendationError {
    return new RecommendationError(
      'Saved search was not found',
      404,
      RECOMMENDATION_ERROR_CODES.SOURCE_NOT_FOUND,
    );
  }
}
