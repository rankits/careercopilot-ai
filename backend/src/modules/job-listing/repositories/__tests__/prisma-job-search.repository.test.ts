import { afterEach, describe, expect, it, vi } from 'vitest';
import '@/test-utils/prisma-mock.js';
import { prisma } from '@/shared/config/db.conf.js';
import { PrismaJobSearchRepository } from '@/modules/job-listing/repositories/prisma-job-search.repository.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PrismaJobSearchRepository.findById', () => {
  it('loads only ACTIVE jobs for public detail', async () => {
    const findFirst = vi.spyOn(prisma.job, 'findFirst').mockResolvedValue(null);

    const repo = new PrismaJobSearchRepository();
    const result = await repo.findById('job-1');

    expect(result).toBeNull();
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-1', status: 'ACTIVE' },
      }),
    );
  });

  it('returns null for inactive jobs (EXPIRED/REMOVED) without leaking fields', async () => {
    vi.spyOn(prisma.job, 'findFirst').mockResolvedValue(null);

    const repo = new PrismaJobSearchRepository();
    await expect(repo.findById('expired-job')).resolves.toBeNull();
  });
});
