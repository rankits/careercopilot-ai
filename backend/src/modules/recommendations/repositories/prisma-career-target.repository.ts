import type { CareerTarget } from '@prisma/client';

import { prisma } from '@/shared/config/db.conf.js';

export interface CareerTargetRepository {
  findById(id: string): Promise<CareerTarget | null>;
}

export const prismaCareerTargetRepository: CareerTargetRepository = {
  findById(id) {
    return prisma.careerTarget.findUnique({ where: { id } });
  },
};
