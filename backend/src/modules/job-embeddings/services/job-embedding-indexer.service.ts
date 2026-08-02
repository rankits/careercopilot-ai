import { randomUUID } from 'node:crypto';
import type { EmbeddingProvider } from '@/modules/ai-embeddings/contracts/embedding-provider.js';
import type { ConsumedEventRepository } from '@/infrastructure/messaging/consumed-event.repository.js';
import { PrismaConsumedEventRepository } from '@/infrastructure/messaging/consumed-event.repository.js';
import type { JobEmbeddingRepository } from '@/modules/job-embeddings/contracts/job-embedding.repository.js';
import type { JobEmbeddingSourceRepository } from '@/modules/job-embeddings/contracts/job-embedding-source.repository.js';
import { jobEmbeddingConfig } from '@/modules/job-embeddings/config/job-embedding.config.js';
import { PrismaJobEmbeddingSourceRepository } from '@/modules/job-embeddings/repositories/prisma-job-embedding-source.repository.js';
import {
  buildJobEmbeddingDocument,
  createJobEmbeddingContentHash,
} from '@/modules/job-embeddings/utils/job-embedding-content.js';
import type { JobSemanticContentChangedEvent } from '@/modules/jobs/events/job.events.js';
import { jobAgePolicy } from '@/modules/jobs/policies/job-age-policy.js';
import { env } from '@/shared/config/env.conf.js';
import { logJobEmbeddingIndexOutcome } from '@/modules/job-embeddings/observability/job-embedding-coverage.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

export const JOB_EMBEDDING_CONSUMER_NAME = 'job-embedding-indexer.v1';

export type JobEmbeddingIndexOutcome =
  | 'INDEXED'
  | 'ALREADY_PROCESSED'
  | 'ALREADY_CURRENT'
  | 'STALE_EVENT'
  | 'JOB_REMOVED'
  | 'SKIPPED_OUTSIDE_STORAGE_WINDOW'
  | 'SKIPPED_OUTSIDE_EMBEDDING_WINDOW';

export class JobEmbeddingIndexerService {
  constructor(
    private readonly provider: EmbeddingProvider,
    private readonly embeddings: JobEmbeddingRepository,
    private readonly sources: JobEmbeddingSourceRepository = new PrismaJobEmbeddingSourceRepository(),
    private readonly consumedEvents: ConsumedEventRepository = new PrismaConsumedEventRepository(),
    private readonly workerId = `job-embedding-${process.pid}-${randomUUID()}`,
    private readonly claimStaleAfterMs = 30_000,
    private readonly onOutcome?: (input: {
      jobId: string;
      eventId: string;
      outcome: JobEmbeddingIndexOutcome;
    }) => void,
  ) {}

  async process(
    eventId: string,
    event: JobSemanticContentChangedEvent,
  ): Promise<JobEmbeddingIndexOutcome> {
    const claim = await this.consumedEvents.claim(
      eventId,
      JOB_EMBEDDING_CONSUMER_NAME,
      this.workerId,
      this.claimStaleAfterMs,
    );
    if (claim === 'COMPLETED') return 'ALREADY_PROCESSED';
    if (claim === 'BUSY') {
      throw new AppError('Embedding event is already being processed', 409, 'EMBEDDING_EVENT_BUSY');
    }

    try {
      const outcome = await this.index(event);
      const completed = await this.consumedEvents.complete(
        eventId,
        JOB_EMBEDDING_CONSUMER_NAME,
        this.workerId,
      );
      if (!completed) {
        throw new AppError('Embedding event ownership was lost', 409, 'EMBEDDING_EVENT_LOCK_LOST');
      }
      this.onOutcome?.({ jobId: event.jobId, eventId, outcome });
      return outcome;
    } catch (error) {
      await this.consumedEvents.release(eventId, JOB_EMBEDDING_CONSUMER_NAME, this.workerId);
      throw error;
    }
  }

  private async index(event: JobSemanticContentChangedEvent): Promise<JobEmbeddingIndexOutcome> {
    const source = await this.sources.findByJobId(event.jobId);
    if (!source) return 'JOB_REMOVED';
    if (source.version !== event.jobVersion) return 'STALE_EVENT';
    if (source.status !== 'ACTIVE') {
      await this.embeddings.deleteForJob(source.jobId);
      return 'JOB_REMOVED';
    }

    const storageEligibility = jobAgePolicy.evaluateStorageEligibility({
      effectiveDate: source.effectivePostedAt,
    });
    if (!storageEligibility.eligible) {
      if (env.JOB_REMOVE_OUTDATED_EMBEDDINGS) {
        await this.embeddings.deleteForJob(source.jobId);
      }
      return 'SKIPPED_OUTSIDE_STORAGE_WINDOW';
    }

    const embeddingEligibility = jobAgePolicy.evaluateEmbeddingEligibility({
      effectiveDate: source.effectivePostedAt,
      isActive: true,
    });
    if (!embeddingEligibility.eligible) {
      if (env.JOB_REMOVE_OUTDATED_EMBEDDINGS) {
        await this.embeddings.deleteForJob(source.jobId);
      }
      return 'SKIPPED_OUTSIDE_EMBEDDING_WINDOW';
    }

    const contentHash = createJobEmbeddingContentHash(
      source,
      jobEmbeddingConfig.documentSchemaVersion,
    );
    const current = await this.embeddings.findCurrent(
      source.jobId,
      this.provider.provider,
      this.provider.model,
    );
    if (
      current?.jobVersion === source.version &&
      current.contentHash === contentHash &&
      current.dimensions === this.provider.dimensions
    ) {
      return 'ALREADY_CURRENT';
    }

    const document = buildJobEmbeddingDocument(source);
    const embedding = await this.provider.generateEmbedding(document, 'DOCUMENT');
    const latest = await this.sources.findByJobId(event.jobId);
    if (!latest) return 'JOB_REMOVED';
    if (latest.status !== 'ACTIVE') {
      await this.embeddings.deleteForJob(latest.jobId);
      return 'JOB_REMOVED';
    }
    if (latest.version !== source.version) return 'STALE_EVENT';

    await this.embeddings.upsert({
      jobId: source.jobId,
      provider: this.provider.provider,
      model: this.provider.model,
      contentHash,
      jobVersion: source.version,
      embedding,
    });
    return 'INDEXED';
  }
}
