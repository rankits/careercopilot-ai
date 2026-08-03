import { JobStatus } from '@prisma/client';
import { prisma } from '@/shared/config/db.conf.js';
import { env } from '@/shared/config/env.conf.js';
import { jobAgePolicy } from '@/modules/jobs/policies/job-age-policy.js';
import { jobsLogger } from '@/shared/utils/logger.js';

export interface StorageRetentionCleanupOptions {
  readonly dryRun?: boolean;
  readonly batchSize?: number;
  readonly afterJobId?: string;
}

export interface StorageRetentionCleanupSummary {
  readonly scanned: number;
  readonly expired: number;
  readonly deleted: number;
  readonly embeddingsRemoved: number;
  readonly dryRun: boolean;
  readonly action: 'EXPIRE' | 'DELETE';
  readonly storageCutoff: string | null;
  readonly cursorJobId?: string;
  readonly skippedDisabled: boolean;
}

export class StorageRetentionCleanupService {
  async run(options: StorageRetentionCleanupOptions = {}): Promise<StorageRetentionCleanupSummary> {
    const dryRun = options.dryRun === true;
    const batchSize = options.batchSize ?? env.JOB_RETENTION_CLEANUP_BATCH_SIZE;
    const action = env.JOB_STORAGE_EXPIRED_ACTION;
    const storageCutoff = jobAgePolicy.getStorageCutoffDate();

    if (!storageCutoff) {
      jobsLogger.info('Storage retention cleanup skipped (storage age filter disabled)');
      return {
        scanned: 0,
        expired: 0,
        deleted: 0,
        embeddingsRemoved: 0,
        dryRun,
        action,
        storageCutoff: null,
        cursorJobId: options.afterJobId,
        skippedDisabled: true,
      };
    }

    let scanned = 0;
    let expired = 0;
    let deleted = 0;
    let embeddingsRemoved = 0;
    let cursorJobId = options.afterJobId;

    while (true) {
      const batch = await prisma.job.findMany({
        where: {
          status: JobStatus.ACTIVE,
          effectivePostedAt: { lt: storageCutoff },
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
          if (action === 'DELETE') deleted++;
          else expired++;
          continue;
        }

        if (action === 'DELETE') {
          // JobEmbedding rows cascade on job delete.
          await prisma.job.delete({ where: { id: job.id } });
          deleted++;
        } else {
          const embeddingCount = await prisma.$transaction(async (tx) => {
            await tx.job.update({
              where: { id: job.id },
              data: { status: JobStatus.EXPIRED },
            });
            const removed = await tx.jobEmbedding.deleteMany({ where: { jobId: job.id } });
            return removed.count;
          });
          expired++;
          embeddingsRemoved += embeddingCount;
        }
      }

      jobsLogger.info(
        {
          scanned,
          expired,
          deleted,
          embeddingsRemoved,
          cursorJobId,
          dryRun,
          action,
        },
        'Storage retention cleanup batch completed',
      );

      if (batch.length < batchSize) break;
    }

    return {
      scanned,
      expired,
      deleted,
      embeddingsRemoved,
      dryRun,
      action,
      storageCutoff: storageCutoff.toISOString(),
      cursorJobId,
      skippedDisabled: false,
    };
  }
}
