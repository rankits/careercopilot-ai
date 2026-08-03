import { randomUUID } from 'node:crypto';
import type { EmbeddingProvider } from '@/modules/ai-embeddings/contracts/embedding-provider.js';
import { embeddingConfig } from '@/modules/ai-embeddings/config/embedding.config.js';
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
import { packDocumentsForEmbedding } from '@/modules/job-embeddings/utils/pack-documents-for-embedding.js';
import type { JobSemanticContentChangedEvent } from '@/modules/jobs/events/job.events.js';
import type { JobEmbeddingSource } from '@/modules/job-embeddings/types/job-embedding.types.js';
import { jobAgePolicy } from '@/modules/jobs/policies/job-age-policy.js';
import { env } from '@/shared/config/env.conf.js';
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

export interface JobEmbeddingProcessRequest {
  readonly eventId: string;
  readonly event: JobSemanticContentChangedEvent;
}

export interface JobEmbeddingProcessResult {
  readonly eventId: string;
  readonly jobId: string;
  readonly outcome?: JobEmbeddingIndexOutcome;
  readonly error?: unknown;
}

type PreparedForEmbed = {
  readonly eventId: string;
  readonly event: JobSemanticContentChangedEvent;
  readonly source: JobEmbeddingSource;
  readonly contentHash: string;
  readonly document: string;
  readonly id: string;
};

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
    private readonly maxBatchSize = embeddingConfig.batchSize,
    private readonly maxBatchCharacters = embeddingConfig.batchMaxCharacters,
  ) {}

  /** Single-message entrypoint (preserves prior API). */
  async process(
    eventId: string,
    event: JobSemanticContentChangedEvent,
  ): Promise<JobEmbeddingIndexOutcome> {
    const [result] = await this.processMany([{ eventId, event }]);
    if (result.error) throw result.error;
    return result.outcome!;
  }

  /**
   * Process many events with shared provider batching.
   * Each event keeps independent claim/complete/release and error outcome.
   */
  async processMany(
    requests: readonly JobEmbeddingProcessRequest[],
  ): Promise<JobEmbeddingProcessResult[]> {
    const results = new Map<string, JobEmbeddingProcessResult>();
    const toEmbed: PreparedForEmbed[] = [];

    for (const request of requests) {
      try {
        const prepared = await this.prepare(request);
        if (prepared.kind === 'done') {
          results.set(request.eventId, {
            eventId: request.eventId,
            jobId: request.event.jobId,
            outcome: prepared.outcome,
          });
        } else {
          toEmbed.push(prepared.item);
        }
      } catch (error) {
        results.set(request.eventId, {
          eventId: request.eventId,
          jobId: request.event.jobId,
          error,
        });
      }
    }

    const { packs, oversized } = packDocumentsForEmbedding(toEmbed, {
      maxItems: this.maxBatchSize,
      maxCharacters: this.maxBatchCharacters,
    });

    for (const item of oversized) {
      await this.failClaimed(
        item.eventId,
        new AppError(
          `Job embedding document exceeds AI_EMBEDDING_BATCH_MAX_CHARACTERS (${this.maxBatchCharacters})`,
          422,
          'EMBEDDING_DOCUMENT_TOO_LARGE',
        ),
      );
      results.set(item.eventId, {
        eventId: item.eventId,
        jobId: item.event.jobId,
        error: new AppError(
          `Job embedding document exceeds AI_EMBEDDING_BATCH_MAX_CHARACTERS (${this.maxBatchCharacters})`,
          422,
          'EMBEDDING_DOCUMENT_TOO_LARGE',
        ),
      });
    }

    for (const pack of packs) {
      let vectors: number[][];
      try {
        vectors = await this.provider.generateEmbeddings(
          pack.map((item) => item.document),
          'DOCUMENT',
        );
      } catch (error) {
        for (const item of pack) {
          await this.failClaimed(item.eventId, error);
          results.set(item.eventId, {
            eventId: item.eventId,
            jobId: item.event.jobId,
            error,
          });
        }
        continue;
      }

      if (vectors.length !== pack.length) {
        const error = new AppError(
          'Embedding provider returned unexpected vector count',
          502,
          'EMBEDDING_BATCH_SIZE_MISMATCH',
        );
        for (const item of pack) {
          await this.failClaimed(item.eventId, error);
          results.set(item.eventId, {
            eventId: item.eventId,
            jobId: item.event.jobId,
            error,
          });
        }
        continue;
      }

      for (let index = 0; index < pack.length; index++) {
        const item = pack[index]!;
        const embedding = vectors[index]!;
        try {
          const outcome = await this.persistPrepared(item, embedding);
          const completed = await this.consumedEvents.complete(
            item.eventId,
            JOB_EMBEDDING_CONSUMER_NAME,
            this.workerId,
          );
          if (!completed) {
            throw new AppError(
              'Embedding event ownership was lost',
              409,
              'EMBEDDING_EVENT_LOCK_LOST',
            );
          }
          this.onOutcome?.({
            jobId: item.event.jobId,
            eventId: item.eventId,
            outcome,
          });
          results.set(item.eventId, {
            eventId: item.eventId,
            jobId: item.event.jobId,
            outcome,
          });
        } catch (error) {
          await this.failClaimed(item.eventId, error);
          results.set(item.eventId, {
            eventId: item.eventId,
            jobId: item.event.jobId,
            error,
          });
        }
      }
    }

    return requests.map(
      (request) =>
        results.get(request.eventId) ?? {
          eventId: request.eventId,
          jobId: request.event.jobId,
          error: new AppError('Embedding result missing', 500, 'EMBEDDING_RESULT_MISSING'),
        },
    );
  }

  private async prepare(
    request: JobEmbeddingProcessRequest,
  ): Promise<
    { kind: 'done'; outcome: JobEmbeddingIndexOutcome } | { kind: 'embed'; item: PreparedForEmbed }
  > {
    const { eventId, event } = request;
    const claim = await this.consumedEvents.claim(
      eventId,
      JOB_EMBEDDING_CONSUMER_NAME,
      this.workerId,
      this.claimStaleAfterMs,
    );
    if (claim === 'COMPLETED') return { kind: 'done', outcome: 'ALREADY_PROCESSED' };
    if (claim === 'BUSY') {
      throw new AppError('Embedding event is already being processed', 409, 'EMBEDDING_EVENT_BUSY');
    }

    try {
      const early = await this.evaluateWithoutProvider(event);
      if (early.kind === 'done') {
        const completed = await this.consumedEvents.complete(
          eventId,
          JOB_EMBEDDING_CONSUMER_NAME,
          this.workerId,
        );
        if (!completed) {
          throw new AppError(
            'Embedding event ownership was lost',
            409,
            'EMBEDDING_EVENT_LOCK_LOST',
          );
        }
        this.onOutcome?.({ jobId: event.jobId, eventId, outcome: early.outcome });
        return early;
      }
      return {
        kind: 'embed',
        item: {
          eventId,
          event,
          source: early.source,
          contentHash: early.contentHash,
          document: early.document,
          id: eventId,
        },
      };
    } catch (error) {
      await this.consumedEvents.release(eventId, JOB_EMBEDDING_CONSUMER_NAME, this.workerId);
      throw error;
    }
  }

  private async evaluateWithoutProvider(event: JobSemanticContentChangedEvent): Promise<
    | { kind: 'done'; outcome: JobEmbeddingIndexOutcome }
    | {
        kind: 'embed';
        source: JobEmbeddingSource;
        contentHash: string;
        document: string;
      }
  > {
    const source = await this.sources.findByJobId(event.jobId);
    if (!source) return { kind: 'done', outcome: 'JOB_REMOVED' };
    if (source.version !== event.jobVersion) return { kind: 'done', outcome: 'STALE_EVENT' };
    if (source.status !== 'ACTIVE') {
      await this.embeddings.deleteForJob(source.jobId);
      return { kind: 'done', outcome: 'JOB_REMOVED' };
    }

    const storageEligibility = jobAgePolicy.evaluateStorageEligibility({
      effectiveDate: source.effectivePostedAt,
    });
    if (!storageEligibility.eligible) {
      if (env.JOB_REMOVE_OUTDATED_EMBEDDINGS) {
        await this.embeddings.deleteForJob(source.jobId);
      }
      return { kind: 'done', outcome: 'SKIPPED_OUTSIDE_STORAGE_WINDOW' };
    }

    const embeddingEligibility = jobAgePolicy.evaluateEmbeddingEligibility({
      effectiveDate: source.effectivePostedAt,
      isActive: true,
    });
    if (!embeddingEligibility.eligible) {
      if (env.JOB_REMOVE_OUTDATED_EMBEDDINGS) {
        await this.embeddings.deleteForJob(source.jobId);
      }
      return { kind: 'done', outcome: 'SKIPPED_OUTSIDE_EMBEDDING_WINDOW' };
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
      return { kind: 'done', outcome: 'ALREADY_CURRENT' };
    }

    return {
      kind: 'embed',
      source,
      contentHash,
      document: buildJobEmbeddingDocument(source),
    };
  }

  private async persistPrepared(
    item: PreparedForEmbed,
    embedding: number[],
  ): Promise<JobEmbeddingIndexOutcome> {
    const latest = await this.sources.findByJobId(item.event.jobId);
    if (!latest) return 'JOB_REMOVED';
    if (latest.status !== 'ACTIVE') {
      await this.embeddings.deleteForJob(latest.jobId);
      return 'JOB_REMOVED';
    }
    if (latest.version !== item.source.version) return 'STALE_EVENT';

    await this.embeddings.upsert({
      jobId: item.source.jobId,
      provider: this.provider.provider,
      model: this.provider.model,
      contentHash: item.contentHash,
      jobVersion: item.source.version,
      embedding,
    });
    return 'INDEXED';
  }

  private async failClaimed(eventId: string, _error: unknown): Promise<void> {
    await this.consumedEvents.release(eventId, JOB_EMBEDDING_CONSUMER_NAME, this.workerId);
  }
}
