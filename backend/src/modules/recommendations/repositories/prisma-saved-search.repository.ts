import type { SavedSearch } from '@prisma/client';
import { Prisma } from '@prisma/client';

import { prisma } from '@/shared/config/db.conf.js';

export interface SavedSearchListPage {
  items: SavedSearch[];
  page: number;
  limit: number;
  total: number;
}

export interface CreateSavedSearchInput {
  userId: string;
  name: string;
  query?: string | null;
  filters: unknown;
  context?: unknown;
}

export interface UpdateSavedSearchInput {
  name?: string;
  query?: string | null;
  filters?: unknown;
  context?: unknown;
}

export interface SavedSearchRepository {
  findById(id: string): Promise<SavedSearch | null>;
  findOwned(userId: string, id: string): Promise<SavedSearch | null>;
  listByUser(
    userId: string,
    pagination: { page: number; limit: number },
  ): Promise<SavedSearchListPage>;
  create(input: CreateSavedSearchInput): Promise<SavedSearch>;
  updateOwned(
    userId: string,
    id: string,
    input: UpdateSavedSearchInput,
  ): Promise<SavedSearch | null>;
  softDeleteOwned(userId: string, id: string): Promise<boolean>;
}

const toInputJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

export const prismaSavedSearchRepository: SavedSearchRepository = {
  findById(id) {
    return prisma.savedSearch.findUnique({ where: { id } });
  },
  findOwned(userId, id) {
    return prisma.savedSearch.findFirst({ where: { id, userId, deletedAt: null } });
  },
  async listByUser(userId, pagination) {
    const page = Math.max(1, pagination.page);
    const limit = Math.max(1, Math.min(100, pagination.limit));
    const skip = (page - 1) * limit;
    const where = { userId, deletedAt: null };
    const [total, items] = await Promise.all([
      prisma.savedSearch.count({ where }),
      prisma.savedSearch.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip,
        take: limit,
      }),
    ]);
    return { items, page, limit, total };
  },
  create(input) {
    return prisma.savedSearch.create({
      data: {
        userId: input.userId,
        name: input.name,
        query: input.query ?? null,
        filters: toInputJson(input.filters ?? {}),
        context: input.context === undefined ? undefined : toInputJson(input.context),
      },
    });
  },
  async updateOwned(userId, id, input) {
    const existing = await this.findOwned(userId, id);
    if (!existing) return null;
    return prisma.savedSearch.update({
      where: { id },
      data: {
        name: input.name,
        query: input.query,
        filters: input.filters === undefined ? undefined : toInputJson(input.filters),
        context: input.context === undefined ? undefined : toInputJson(input.context),
      },
    });
  },
  async softDeleteOwned(userId, id) {
    const existing = await this.findOwned(userId, id);
    if (!existing) return false;
    await prisma.savedSearch.update({ where: { id }, data: { deletedAt: new Date() } });
    return true;
  },
};
