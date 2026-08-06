import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const prisma = {
    job: { findMany: vi.fn(), delete: vi.fn(), update: vi.fn() },
    jobEmbedding: { deleteMany: vi.fn() },
  };
  prisma.$transaction = vi.fn(async (fn: (tx: typeof prisma) => Promise<number>) => fn(prisma));
  return {
    prisma,
    env: {
      JOB_RETENTION_CLEANUP_BATCH_SIZE: 500,
      JOB_STORAGE_EXPIRED_ACTION: 'EXPIRE',
    },
    policy: { getStorageCutoffDate: vi.fn(() => new Date('2025-01-01T00:00:00.000Z')) },
    logger: { info: vi.fn() },
  };
});

vi.mock('@/shared/config/db.conf.js', () => ({ prisma: h.prisma, default: h.prisma }));
vi.mock('@/shared/config/env.conf.js', () => ({ env: h.env }));
vi.mock('@/modules/jobs/policies/job-age-policy.js', () => ({ jobAgePolicy: h.policy }));
vi.mock('@/shared/utils/logger.js', () => ({ jobsLogger: h.logger }));

import { StorageRetentionCleanupService } from '@/modules/jobs/services/storage-retention-cleanup.service.js';
import { JobStatus } from '@prisma/client';

beforeEach(() => {
  h.prisma.job.findMany.mockReset();
  h.prisma.job.delete.mockReset();
  h.prisma.job.update.mockReset();
  h.prisma.jobEmbedding.deleteMany.mockReset();
  h.logger.info.mockReset();
  h.policy.getStorageCutoffDate.mockReset();
  h.policy.getStorageCutoffDate.mockReturnValue(new Date('2025-01-01T00:00:00.000Z'));
  h.env.JOB_STORAGE_EXPIRED_ACTION = 'EXPIRE';
});

describe('StorageRetentionCleanupService', () => {
  it('skips when the storage age filter is disabled', async () => {
    h.policy.getStorageCutoffDate.mockReturnValue(undefined);
    const summary = await new StorageRetentionCleanupService().run();
    expect(summary.skippedDisabled).toBe(true);
    expect(summary.scanned).toBe(0);
    expect(h.prisma.job.findMany).not.toHaveBeenCalled();
  });

  it('counts expired jobs in dry-run mode without mutating', async () => {
    h.prisma.job.findMany.mockResolvedValueOnce([{ id: 'a' }]).mockResolvedValueOnce([]);
    const summary = await new StorageRetentionCleanupService().run({ dryRun: true, batchSize: 5 });
    expect(summary.expired).toBe(1);
    expect(summary.deleted).toBe(0);
    expect(h.prisma.job.delete).not.toHaveBeenCalled();
    expect(h.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('counts deleted jobs in dry-run mode when action is DELETE', async () => {
    h.env.JOB_STORAGE_EXPIRED_ACTION = 'DELETE';
    h.prisma.job.findMany.mockResolvedValueOnce([{ id: 'a' }]).mockResolvedValueOnce([]);
    const summary = await new StorageRetentionCleanupService().run({ dryRun: true });
    expect(summary.deleted).toBe(1);
    expect(summary.expired).toBe(0);
  });

  it('deletes jobs and cascades embeddings for DELETE action', async () => {
    h.env.JOB_STORAGE_EXPIRED_ACTION = 'DELETE';
    h.prisma.job.findMany.mockResolvedValueOnce([{ id: 'a' }]).mockResolvedValueOnce([]);
    h.prisma.job.delete.mockResolvedValue({ id: 'a' });
    const summary = await new StorageRetentionCleanupService().run({ batchSize: 10 });
    expect(summary.deleted).toBe(1);
    expect(h.prisma.job.delete).toHaveBeenCalledWith({ where: { id: 'a' } });
  });

  it('expires jobs and removes embeddings via a transaction for EXPIRE action', async () => {
    h.prisma.job.findMany
      .mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }])
      .mockResolvedValueOnce([]);
    h.prisma.jobEmbedding.deleteMany.mockResolvedValue({ count: 3 });
    const summary = await new StorageRetentionCleanupService().run({ batchSize: 2 });
    expect(summary.expired).toBe(2);
    expect(summary.embeddingsRemoved).toBe(6);
    expect(h.prisma.job.update).toHaveBeenCalledWith({
      where: { id: 'a' },
      data: { status: JobStatus.EXPIRED },
    });
    expect(h.prisma.job.update).toHaveBeenCalledWith({
      where: { id: 'b' },
      data: { status: JobStatus.EXPIRED },
    });
  });

  it('honours a resume cursor across batches', async () => {
    h.prisma.job.findMany.mockResolvedValueOnce([{ id: 'z' }]);
    await new StorageRetentionCleanupService().run({
      dryRun: true,
      batchSize: 10,
      afterJobId: 'start',
    });
    expect(h.prisma.job.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ id: { gt: 'start' } }),
      }),
    );
  });
});
