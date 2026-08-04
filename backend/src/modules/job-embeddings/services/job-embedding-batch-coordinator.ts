import type {
  JobEmbeddingIndexerService,
  JobEmbeddingIndexOutcome,
  JobEmbeddingProcessRequest,
} from '@/modules/job-embeddings/services/job-embedding-indexer.service.js';
import type { JobSemanticContentChangedEvent } from '@/modules/jobs/events/job.events.js';
import { embeddingConfig } from '@/modules/ai-embeddings/config/embedding.config.js';

interface PendingItem {
  readonly request: JobEmbeddingProcessRequest;
  readonly resolve: (outcome: JobEmbeddingIndexOutcome) => void;
  readonly reject: (error: unknown) => void;
}

/**
 * Collects RabbitMQ handler invocations and flushes them through processMany
 * so each message still gets an individual ack/retry outcome.
 */
export class JobEmbeddingBatchCoordinator {
  private readonly pending: PendingItem[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | undefined;
  private flushing = false;

  constructor(
    private readonly indexer: JobEmbeddingIndexerService,
    private readonly maxBatchSize = embeddingConfig.batchSize,
    private readonly flushWaitMs = 50,
  ) {}

  enqueue(
    eventId: string,
    event: JobSemanticContentChangedEvent,
  ): Promise<JobEmbeddingIndexOutcome> {
    return new Promise<JobEmbeddingIndexOutcome>((resolve, reject) => {
      this.pending.push({
        request: { eventId, event },
        resolve,
        reject,
      });

      if (this.pending.length >= this.maxBatchSize) {
        void this.flush();
        return;
      }

      if (!this.flushTimer) {
        this.flushTimer = setTimeout(() => {
          this.flushTimer = undefined;
          void this.flush();
        }, this.flushWaitMs);
      }
    });
  }

  async flush(): Promise<void> {
    if (this.flushing) return;
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }
    if (this.pending.length === 0) return;

    this.flushing = true;
    try {
      while (this.pending.length > 0) {
        const chunk = this.pending.splice(0, this.maxBatchSize);
        const results = await this.indexer.processMany(chunk.map((item) => item.request));
        for (let index = 0; index < chunk.length; index++) {
          const item = chunk[index]!;
          const result = results[index]!;
          if (result.error) item.reject(result.error);
          else item.resolve(result.outcome!);
        }
      }
    } finally {
      this.flushing = false;
      if (this.pending.length > 0) void this.flush();
    }
  }
}
