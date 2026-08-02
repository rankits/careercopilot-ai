import type { CareerTarget } from '@prisma/client';
import { Prisma } from '@prisma/client';

import { prisma } from '@/shared/config/db.conf.js';

export interface CareerTargetListPage {
  items: CareerTarget[];
  page: number;
  limit: number;
  total: number;
}

export interface CreateCareerTargetInput {
  userId: string;
  goalText: string;
  structured?: unknown;
}

export interface CareerTargetRepository {
  findById(id: string): Promise<CareerTarget | null>;
  findOwned(userId: string, id: string): Promise<CareerTarget | null>;
  listByUser(
    userId: string,
    pagination: { page: number; limit: number },
  ): Promise<CareerTargetListPage>;
  create(input: CreateCareerTargetInput): Promise<CareerTarget>;
  archiveOwned(userId: string, id: string): Promise<boolean>;
}

const toInputJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

export const prismaCareerTargetRepository: CareerTargetRepository = {
  findById(id) {
    return prisma.careerTarget.findUnique({ where: { id } });
  },
  findOwned(userId, id) {
    return prisma.careerTarget.findFirst({ where: { id, userId, archivedAt: null } });
  },
  async listByUser(userId, pagination) {
    const page = Math.max(1, pagination.page);
    const limit = Math.max(1, Math.min(100, pagination.limit));
    const skip = (page - 1) * limit;
    const where = { userId, archivedAt: null };
    const [total, items] = await Promise.all([
      prisma.careerTarget.count({ where }),
      prisma.careerTarget.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip,
        take: limit,
      }),
    ]);
    return { items, page, limit, total };
  },
  create(input) {
    return prisma.careerTarget.create({
      data: {
        userId: input.userId,
        goalText: input.goalText,
        structured: toInputJson(input.structured ?? {}),
      },
    });
  },
  async archiveOwned(userId, id) {
    const existing = await this.findOwned(userId, id);
    if (!existing) return false;
    await prisma.careerTarget.update({ where: { id }, data: { archivedAt: new Date() } });
    return true;
  },
};
