import type { Logger } from 'pino';
import type { JobEmbeddingBackfillRepository } from '@/modules/job-embeddings/contracts/job-embedding-backfill.repository.js';
import { jobEmbeddingConfig } from '@/modules/job-embeddings/config/job-embedding.config.js';
import { JOB_EMBEDDING_DIMENSIONS } from '@/modules/job-embeddings/constants/job-embedding.constants.js';
import type {
  JobEmbeddingBackfillCandidate,
  JobEmbeddingBackfillOptions,
  JobEmbeddingBackfillSummary,
} from '@/modules/job-embeddings/types/job-embedding-backfill.types.js';
import { createJobEmbeddingContentHash } from '@/modules/job-embeddings/utils/job-embedding-content.js';
import type { JobSemanticContentChangedEvent } from '@/modules/jobs/events/job.events.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { logger } from '@/shared/logger/logger.js';

const isCurrentEmbedding = (
  candidate: JobEmbeddingBackfillCandidate,
  contentHash: string,
  dimensions: number,
): boolean =>
  candidate.currentContentHash === contentHash &&
  candidate.currentJobVersion === candidate.jobVersion &&
  candidate.currentDimensions === dimensions;

export class JobEmbeddingBackfillService {
  constructor(
    private readonly repository: JobEmbeddingBackfillRepository,
    private readonly backfillLogger: Logger = logger,
  ) {}

  async run(options: JobEmbeddingBackfillOptions): Promise<JobEmbeddingBackfillSummary> {
    if (!options.provider.trim() || !options.model.trim()) {
      throw new AppError(
        'AI_EMBEDDING_PROVIDER and AI_EMBEDDING_MODEL are required for backfill',
        422,
        'INVALID_BACKFILL_PROVIDER',
      );
    }
    if (options.dimensions !== JOB_EMBEDDING_DIMENSIONS) {
      throw new AppError(
        `Backfill dimensions must equal ${JOB_EMBEDDING_DIMENSIONS}`,
        422,
        'INVALID_BACKFILL_DIMENSIONS',
      );
    }
    if (!Number.isInteger(options.batchSize) || options.batchSize < 1) {
      throw new AppError(
        'batchSize must be a positive integer',
        422,
        'INVALID_BACKFILL_BATCH_SIZE',
      );
    }
    if (
      options.maxJobs !== undefined &&
      (!Number.isInteger(options.maxJobs) || options.maxJobs < 1)
    ) {
      throw new AppError('maxJobs must be a positive integer', 422, 'INVALID_BACKFILL_MAX_JOBS');
    }

    let scanned = 0;
    let enqueued = 0;
    let skippedCurrent = 0;
    let failed = 0;
    let cursorJobId = options.afterJobId;

    while (true) {
      if (options.maxJobs !== undefined && scanned >= options.maxJobs) break;

      const remaining =
        options.maxJobs === undefined ? options.batchSize : options.maxJobs - scanned;
      const batchSize = Math.min(options.batchSize, remaining);
      const batch = await this.repository.scanActiveJobs({
        provider: options.provider,
        model: options.model,
        batchSize,
        afterJobId: cursorJobId,
      });

      if (batch.candidates.length === 0) break;

      for (const candidate of batch.candidates) {
        scanned++;
        try {
          const contentHash = createJobEmbeddingContentHash(
            candidate,
            options.documentSchemaVersion,
          );
          const current = isCurrentEmbedding(candidate, contentHash, options.dimensions);
          if (current && !options.force) {
            skippedCurrent++;
            continue;
          }

          const event: JobSemanticContentChangedEvent = {
            jobId: candidate.jobId,
            jobVersion: candidate.jobVersion,
            outcome: candidate.currentContentHash ? 'SEMANTIC_CHANGED' : 'INSERTED',
            occurredAt: new Date().toISOString(),
          };

          if (!options.dryRun) {
            await this.repository.enqueueSemanticChange(event);
          }
          enqueued++;
        } catch (error) {
          failed++;
          this.backfillLogger.error(
            {
              jobId: candidate.jobId,
              error: error instanceof Error ? error.message : String(error),
            },
            'Failed to enqueue job embedding backfill event',
          );
        }
      }

      cursorJobId = batch.nextCursorJobId ?? cursorJobId;
      this.backfillLogger.info(
        {
          scanned,
          enqueued,
          skippedCurrent,
          failed,
          cursorJobId,
          dryRun: options.dryRun === true,
        },
        'Job embedding backfill batch completed',
      );

      if (!batch.nextCursorJobId || batch.candidates.length < batchSize) break;
    }

    return {
      scanned,
      enqueued,
      skippedCurrent,
      failed,
      dryRun: options.dryRun === true,
      force: options.force === true,
      provider: options.provider,
      model: options.model,
      cursorJobId,
    };
  }
}

export const resolveBackfillOptions = (
  overrides: Partial<JobEmbeddingBackfillOptions> = {},
): JobEmbeddingBackfillOptions => ({
  provider: overrides.provider ?? jobEmbeddingConfig.provider ?? '',
  model: overrides.model ?? jobEmbeddingConfig.model ?? '',
  dimensions: overrides.dimensions ?? jobEmbeddingConfig.dimensions,
  documentSchemaVersion:
    overrides.documentSchemaVersion ?? jobEmbeddingConfig.documentSchemaVersion,
  batchSize: overrides.batchSize ?? 100,
  afterJobId: overrides.afterJobId,
  force: overrides.force === true,
  dryRun: overrides.dryRun === true,
  maxJobs: overrides.maxJobs,
});
