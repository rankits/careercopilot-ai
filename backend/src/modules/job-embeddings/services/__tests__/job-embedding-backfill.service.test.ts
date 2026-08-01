import { describe, expect, it } from 'vitest';
import pino from 'pino';
import type { JobEmbeddingBackfillRepository } from '@/modules/job-embeddings/contracts/job-embedding-backfill.repository.js';
import { JOB_EMBEDDING_DIMENSIONS } from '@/modules/job-embeddings/constants/job-embedding.constants.js';
import { JobEmbeddingBackfillService } from '@/modules/job-embeddings/services/job-embedding-backfill.service.js';
import type {
  JobEmbeddingBackfillBatch,
  JobEmbeddingBackfillCandidate,
} from '@/modules/job-embeddings/types/job-embedding-backfill.types.js';
import { createJobEmbeddingContentHash } from '@/modules/job-embeddings/utils/job-embedding-content.js';
import type { JobSemanticContentChangedEvent } from '@/modules/jobs/events/job.events.js';

const candidate = (
  overrides: Partial<JobEmbeddingBackfillCandidate> = {},
): JobEmbeddingBackfillCandidate => ({
  jobId: 'job-1',
  jobVersion: 2,
  companySlug: 'acme',
  companyName: 'Acme',
  title: 'Senior Engineer',
  descriptionText: 'Build reliable systems.',
  remoteType: 'REMOTE',
  employmentType: 'FULL_TIME',
  skills: ['TypeScript'],
  tags: ['Backend'],
  currentContentHash: null,
  currentJobVersion: null,
  currentDimensions: null,
  ...overrides,
});

class MemoryBackfillRepository implements JobEmbeddingBackfillRepository {
  batches: JobEmbeddingBackfillBatch[] = [];
  enqueued: JobSemanticContentChangedEvent[] = [];
  scanCalls: Array<{ afterJobId?: string; batchSize: number }> = [];
  failEnqueueFor = new Set<string>();

  async scanActiveJobs(input: {
    provider: string;
    model: string;
    batchSize: number;
    afterJobId?: string;
  }): Promise<JobEmbeddingBackfillBatch> {
    this.scanCalls.push({ afterJobId: input.afterJobId, batchSize: input.batchSize });
    return this.batches.shift() ?? { candidates: [] };
  }

  async enqueueSemanticChange(event: JobSemanticContentChangedEvent): Promise<void> {
    if (this.failEnqueueFor.has(event.jobId)) {
      throw new Error('outbox unavailable');
    }
    this.enqueued.push(event);
  }
}

const options = {
  provider: 'groq',
  model: 'configured-model',
  dimensions: JOB_EMBEDDING_DIMENSIONS,
  documentSchemaVersion: '1',
  batchSize: 2,
};

const silentLogger = pino({ enabled: false });

describe('JobEmbeddingBackfillService', () => {
  it('enqueues missing embeddings and skips current ones', async () => {
    const repository = new MemoryBackfillRepository();
    const missing = candidate({ jobId: 'job-missing' });
    const currentHash = createJobEmbeddingContentHash(candidate({ jobId: 'job-current' }), '1');
    const current = candidate({
      jobId: 'job-current',
      currentContentHash: currentHash,
      currentJobVersion: 2,
      currentDimensions: JOB_EMBEDDING_DIMENSIONS,
    });
    repository.batches = [{ candidates: [missing, current], nextCursorJobId: 'job-current' }];

    const service = new JobEmbeddingBackfillService(repository, silentLogger);
    const summary = await service.run(options);

    expect(summary).toMatchObject({
      scanned: 2,
      enqueued: 1,
      skippedCurrent: 1,
      failed: 0,
      dryRun: false,
    });
    expect(repository.enqueued).toEqual([
      {
        jobId: 'job-missing',
        jobVersion: 2,
        outcome: 'INSERTED',
        occurredAt: expect.any(String),
      },
    ]);
  });

  it('force-reindexes current embeddings as semantic changes', async () => {
    const repository = new MemoryBackfillRepository();
    const currentHash = createJobEmbeddingContentHash(candidate(), '1');
    repository.batches = [
      {
        candidates: [
          candidate({
            currentContentHash: currentHash,
            currentJobVersion: 2,
            currentDimensions: JOB_EMBEDDING_DIMENSIONS,
          }),
        ],
        nextCursorJobId: 'job-1',
      },
    ];

    const service = new JobEmbeddingBackfillService(repository, silentLogger);
    const summary = await service.run({ ...options, force: true });

    expect(summary.enqueued).toBe(1);
    expect(repository.enqueued[0]).toMatchObject({
      jobId: 'job-1',
      outcome: 'SEMANTIC_CHANGED',
    });
  });

  it('supports dry-run and resumable cursors without writing events', async () => {
    const repository = new MemoryBackfillRepository();
    repository.batches = [
      {
        candidates: [candidate({ jobId: 'job-a' }), candidate({ jobId: 'job-b' })],
        nextCursorJobId: 'job-b',
      },
      {
        candidates: [candidate({ jobId: 'job-c' })],
        nextCursorJobId: 'job-c',
      },
    ];

    const service = new JobEmbeddingBackfillService(repository, silentLogger);
    const summary = await service.run({
      ...options,
      dryRun: true,
      afterJobId: 'job-0',
      maxJobs: 3,
    });

    expect(summary).toMatchObject({
      scanned: 3,
      enqueued: 3,
      dryRun: true,
      cursorJobId: 'job-c',
    });
    expect(repository.enqueued).toHaveLength(0);
    expect(repository.scanCalls[0]).toEqual({ afterJobId: 'job-0', batchSize: 2 });
    expect(repository.scanCalls[1]).toEqual({ afterJobId: 'job-b', batchSize: 1 });
  });

  it('isolates enqueue failures and continues scanning', async () => {
    const repository = new MemoryBackfillRepository();
    repository.failEnqueueFor.add('job-fail');
    repository.batches = [
      {
        candidates: [candidate({ jobId: 'job-fail' }), candidate({ jobId: 'job-ok' })],
        nextCursorJobId: 'job-ok',
      },
    ];

    const service = new JobEmbeddingBackfillService(repository, silentLogger);
    const summary = await service.run(options);

    expect(summary).toMatchObject({
      scanned: 2,
      enqueued: 1,
      failed: 1,
    });
    expect(repository.enqueued.map((event) => event.jobId)).toEqual(['job-ok']);
  });
});
