import type { SavedSearch } from '@prisma/client';

import { prisma } from '@/shared/config/db.conf.js';

export interface SavedSearchRepository {
  findById(id: string): Promise<SavedSearch | null>;
}

export const prismaSavedSearchRepository: SavedSearchRepository = {
  findById(id) {
    return prisma.savedSearch.findUnique({ where: { id } });
  },
};
