import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const prisma = {
    job: { findMany: vi.fn() },
    jobEmbedding: { count: vi.fn(), deleteMany: vi.fn() },
  };
  return {
    prisma,
    env: {
      JOB_EMBEDDING_CLEANUP_BATCH_SIZE: 500,
      JOB_REMOVE_OUTDATED_EMBEDDINGS: true,
      JOB_EMBEDDING_AGE_FILTER_ENABLED: true,
    },
    policy: {
      getStorageCutoffDate: vi.fn(() => new Date('2025-01-01T00:00:00.000Z')),
      getEmbeddingCutoffDate: vi.fn(() => new Date('2026-01-01T00:00:00.000Z')),
    },
    logger: { info: vi.fn() },
  };
});

vi.mock('@/shared/config/db.conf.js', () => ({ prisma: h.prisma, default: h.prisma }));
vi.mock('@/shared/config/env.conf.js', () => ({ env: h.env }));
vi.mock('@/modules/jobs/policies/job-age-policy.js', () => ({ jobAgePolicy: h.policy }));
vi.mock('@/shared/utils/logger.js', () => ({ jobsLogger: h.logger }));

import { EmbeddingAgeCleanupService } from '@/modules/jobs/services/embedding-age-cleanup.service.js';
import { JobStatus } from '@prisma/client';

beforeEach(() => {
  h.prisma.job.findMany.mockReset();
  h.prisma.jobEmbedding.count.mockReset();
  h.prisma.jobEmbedding.deleteMany.mockReset();
  h.logger.info.mockReset();
  h.policy.getStorageCutoffDate.mockReset();
  h.policy.getEmbeddingCutoffDate.mockReset();
  h.policy.getStorageCutoffDate.mockReturnValue(new Date('2025-01-01T00:00:00.000Z'));
  h.policy.getEmbeddingCutoffDate.mockReturnValue(new Date('2026-01-01T00:00:00.000Z'));
});

describe('EmbeddingAgeCleanupService', () => {
  it('skips when the embedding age filter is disabled', async () => {
    h.policy.getEmbeddingCutoffDate.mockReturnValue(undefined);
    const summary = await new EmbeddingAgeCleanupService().run();
    expect(summary.skippedDisabled).toBe(true);
    expect(summary.scanned).toBe(0);
    expect(summary.embeddingCutoff).toBeNull();
    expect(h.prisma.job.findMany).not.toHaveBeenCalled();
  });

  it('skips when JOB_REMOVE_OUTDATED_EMBEDDINGS is false', async () => {
    h.env.JOB_REMOVE_OUTDATED_EMBEDDINGS = false;
    const summary = await new EmbeddingAgeCleanupService().run({ afterJobId: 'c' });
    expect(summary.skippedDisabled).toBe(true);
    expect(summary.cursorJobId).toBe('c');
    h.env.JOB_REMOVE_OUTDATED_EMBEDDINGS = true;
  });

  it('returns an empty summary when no batch is found', async () => {
    h.prisma.job.findMany.mockResolvedValueOnce([]);
    const summary = await new EmbeddingAgeCleanupService().run({ batchSize: 10 });
    expect(summary.scanned).toBe(0);
    expect(summary.embeddingsRemoved).toBe(0);
    expect(summary.skippedDisabled).toBe(false);
  });

  it('counts embeddings without deleting in dry-run mode across batches', async () => {
    h.prisma.job.findMany
      .mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }])
      .mockResolvedValueOnce([]);
    h.prisma.jobEmbedding.count.mockResolvedValue(2);

    const summary = await new EmbeddingAgeCleanupService().run({ dryRun: true, batchSize: 2 });

    expect(summary.scanned).toBe(2);
    expect(summary.embeddingsRemoved).toBe(4);
    expect(h.prisma.jobEmbedding.count).toHaveBeenCalledTimes(2);
    expect(h.prisma.jobEmbedding.deleteMany).not.toHaveBeenCalled();
    expect(summary.storageCutoff).toBe('2025-01-01T00:00:00.000Z');
    expect(summary.embeddingCutoff).toBe('2026-01-01T00:00:00.000Z');
    // first batch was full (length === batchSize) so the loop continues
    expect(h.prisma.job.findMany).toHaveBeenCalledTimes(2);
  });

  it('deletes embeddings when not in dry-run mode', async () => {
    h.prisma.job.findMany.mockResolvedValueOnce([{ id: 'a' }]).mockResolvedValueOnce([]);
    h.prisma.jobEmbedding.deleteMany.mockResolvedValue({ count: 3 });

    const summary = await new EmbeddingAgeCleanupService().run({ batchSize: 5 });

    expect(summary.embeddingsRemoved).toBe(3);
    expect(h.prisma.jobEmbedding.deleteMany).toHaveBeenCalledWith({ where: { jobId: 'a' } });
    expect(summary.skippedDisabled).toBe(false);
  });

  it('builds the date filter without a storage cutoff when none is configured', async () => {
    h.policy.getStorageCutoffDate.mockReturnValue(undefined);
    h.prisma.job.findMany.mockResolvedValueOnce([{ id: 'a' }]).mockResolvedValueOnce([]);
    h.prisma.jobEmbedding.deleteMany.mockResolvedValue({ count: 0 });
    await new EmbeddingAgeCleanupService().run({ batchSize: 10 });

    expect(h.prisma.job.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          status: JobStatus.ACTIVE,
          effectivePostedAt: { lt: new Date('2026-01-01T00:00:00.000Z') },
        }),
      }),
    );
  });
});
