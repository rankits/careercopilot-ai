import type { CareerTarget } from '@prisma/client';
import {
  RECOMMENDATION_ERROR_CODES,
  RecommendationError,
} from '@/modules/recommendations/errors/recommendation.error.js';
import type {
  CareerTargetListPage,
  CareerTargetRepository,
  CreateCareerTargetInput,
} from '@/modules/recommendations/repositories/prisma-career-target.repository.js';

export class CareerTargetService {
  constructor(private readonly repository: CareerTargetRepository) {}

  list(userId: string, pagination: { page: number; limit: number }): Promise<CareerTargetListPage> {
    return this.repository.listByUser(userId, pagination);
  }

  async get(userId: string, id: string): Promise<CareerTarget> {
    const target = await this.repository.findOwned(userId, id);
    if (!target) throw this.notFound();
    return target;
  }

  create(userId: string, input: Omit<CreateCareerTargetInput, 'userId'>): Promise<CareerTarget> {
    return this.repository.create({ ...input, userId });
  }

  async archive(userId: string, id: string): Promise<void> {
    const archived = await this.repository.archiveOwned(userId, id);
    if (!archived) throw this.notFound();
  }

  private notFound(): RecommendationError {
    return new RecommendationError(
      'Career target was not found',
      404,
      RECOMMENDATION_ERROR_CODES.SOURCE_NOT_FOUND,
    );
  }
}
