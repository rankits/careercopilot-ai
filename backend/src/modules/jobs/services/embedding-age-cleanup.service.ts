import { JobStatus, Prisma } from '@prisma/client';
import { prisma } from '@/shared/config/db.conf.js';
import { env } from '@/shared/config/env.conf.js';
import { jobAgePolicy } from '@/modules/jobs/policies/job-age-policy.js';
import { jobsLogger } from '@/shared/utils/logger.js';

export interface EmbeddingAgeCleanupOptions {
  readonly dryRun?: boolean;
  readonly batchSize?: number;
  readonly afterJobId?: string;
}

export interface EmbeddingAgeCleanupSummary {
  readonly scanned: number;
  readonly embeddingsRemoved: number;
  readonly dryRun: boolean;
  readonly removeOutdatedEmbeddings: boolean;
  readonly storageCutoff: string | null;
  readonly embeddingCutoff: string | null;
  readonly cursorJobId?: string;
  readonly skippedDisabled: boolean;
}

export class EmbeddingAgeCleanupService {
  async run(options: EmbeddingAgeCleanupOptions = {}): Promise<EmbeddingAgeCleanupSummary> {
    const dryRun = options.dryRun === true;
    const batchSize = options.batchSize ?? env.JOB_EMBEDDING_CLEANUP_BATCH_SIZE;
    const removeOutdatedEmbeddings = env.JOB_REMOVE_OUTDATED_EMBEDDINGS;
    const storageCutoff = jobAgePolicy.getStorageCutoffDate();
    const embeddingCutoff = jobAgePolicy.getEmbeddingCutoffDate();

    if (!embeddingCutoff || !env.JOB_EMBEDDING_AGE_FILTER_ENABLED) {
      jobsLogger.info('Embedding age cleanup skipped (embedding age filter disabled)');
      return {
        scanned: 0,
        embeddingsRemoved: 0,
        dryRun,
        removeOutdatedEmbeddings,
        storageCutoff: storageCutoff?.toISOString() ?? null,
        embeddingCutoff: null,
        cursorJobId: options.afterJobId,
        skippedDisabled: true,
      };
    }

    if (!removeOutdatedEmbeddings) {
      jobsLogger.info('Embedding age cleanup skipped (JOB_REMOVE_OUTDATED_EMBEDDINGS=false)');
      return {
        scanned: 0,
        embeddingsRemoved: 0,
        dryRun,
        removeOutdatedEmbeddings,
        storageCutoff: storageCutoff?.toISOString() ?? null,
        embeddingCutoff: embeddingCutoff.toISOString(),
        cursorJobId: options.afterJobId,
        skippedDisabled: true,
      };
    }

    // Inside storage window (or no storage filter) but outside embedding window.
    const effectivePostedAtFilter: Prisma.DateTimeFilter = {
      lt: embeddingCutoff,
      ...(storageCutoff ? { gte: storageCutoff } : {}),
    };

    let scanned = 0;
    let embeddingsRemoved = 0;
    let cursorJobId = options.afterJobId;

    while (true) {
      const batch = await prisma.job.findMany({
        where: {
          status: JobStatus.ACTIVE,
          effectivePostedAt: effectivePostedAtFilter,
          ...(cursorJobId ? { id: { gt: cursorJobId } } : {}),
        },
        orderBy: { id: 'asc' },
        take: batchSize,
        select: { id: true },
      });

      if (batch.length === 0) break;

      for (const job of batch) {
        scanned++;
        cursorJobId = job.id;

        if (dryRun) {
          const count = await prisma.jobEmbedding.count({ where: { jobId: job.id } });
          embeddingsRemoved += count;
          continue;
        }

        const removed = await prisma.jobEmbedding.deleteMany({ where: { jobId: job.id } });
        embeddingsRemoved += removed.count;
      }

      jobsLogger.info(
        {
          scanned,
          embeddingsRemoved,
          cursorJobId,
          dryRun,
        },
        'Embedding age cleanup batch completed',
      );

      if (batch.length < batchSize) break;
    }

    return {
      scanned,
      embeddingsRemoved,
      dryRun,
      removeOutdatedEmbeddings,
      storageCutoff: storageCutoff?.toISOString() ?? null,
      embeddingCutoff: embeddingCutoff.toISOString(),
      cursorJobId,
      skippedDisabled: false,
    };
  }
}
