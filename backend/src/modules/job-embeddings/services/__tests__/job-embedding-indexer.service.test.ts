import { describe, expect, it } from 'vitest';
import type {
  EmbeddingProvider,
  EmbeddingPurpose,
} from '@/modules/ai-embeddings/contracts/embedding-provider.js';
import type {
  ConsumedEventClaim,
  ConsumedEventRepository,
} from '@/infrastructure/messaging/consumed-event.repository.js';
import type { JobEmbeddingRepository } from '@/modules/job-embeddings/contracts/job-embedding.repository.js';
import type { JobEmbeddingSourceRepository } from '@/modules/job-embeddings/contracts/job-embedding-source.repository.js';
import { JOB_EMBEDDING_DIMENSIONS } from '@/modules/job-embeddings/constants/job-embedding.constants.js';
import { JobEmbeddingIndexerService } from '@/modules/job-embeddings/services/job-embedding-indexer.service.js';
import { createJobEmbeddingContentHash } from '@/modules/job-embeddings/utils/job-embedding-content.js';
import type {
  JobEmbeddingRecord,
  JobEmbeddingSource,
  SearchJobEmbeddingsInput,
  UpsertJobEmbeddingInput,
} from '@/modules/job-embeddings/types/job-embedding.types.js';
import type { JobSemanticContentChangedEvent } from '@/modules/jobs/events/job.events.js';

class FakeProvider implements EmbeddingProvider {
  readonly provider = 'groq';
  readonly model = 'configured-model';
  readonly dimensions = JOB_EMBEDDING_DIMENSIONS;
  calls: Array<{ text: string; purpose?: EmbeddingPurpose }> = [];
  batchCalls: Array<{ texts: string[]; purpose?: EmbeddingPurpose }> = [];
  failBatch = false;

  async generateEmbedding(text: string, purpose?: EmbeddingPurpose): Promise<number[]> {
    this.calls.push({ text, purpose });
    return Array(this.dimensions).fill(0.1);
  }

  async generateEmbeddings(
    texts: readonly string[],
    purpose?: EmbeddingPurpose,
  ): Promise<number[][]> {
    this.batchCalls.push({ texts: [...texts], purpose });
    if (this.failBatch) throw new Error('provider batch failed');
    return Promise.all(texts.map((text) => this.generateEmbedding(text, purpose)));
  }
}

class FakeEmbeddingRepository implements JobEmbeddingRepository {
  current: JobEmbeddingRecord | null = null;
  upserts: UpsertJobEmbeddingInput[] = [];
  deletes: string[] = [];

  async upsert(input: UpsertJobEmbeddingInput): Promise<JobEmbeddingRecord> {
    this.upserts.push(input);
    return {
      id: 'embedding-id',
      dimensions: input.embedding.length,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...input,
    };
  }

  async findCurrent(): Promise<JobEmbeddingRecord | null> {
    return this.current;
  }

  async searchNearest(_input: SearchJobEmbeddingsInput): Promise<[]> {
    return [];
  }

  async deleteForJob(jobId: string): Promise<number> {
    this.deletes.push(jobId);
    return 1;
  }
}

class FakeSourceRepository implements JobEmbeddingSourceRepository {
  source: JobEmbeddingSource | null = {
    jobId: 'job-id',
    version: 2,
    status: 'ACTIVE',
    companySlug: 'acme',
    companyName: 'Acme',
    title: 'Senior Engineer',
    descriptionText: 'Build reliable systems.',
    remoteType: 'REMOTE',
    employmentType: 'FULL_TIME',
    skills: ['TypeScript'],
    tags: ['Backend'],
    effectivePostedAt: new Date(),
  };

  async findByJobId(): Promise<JobEmbeddingSource | null> {
    return this.source;
  }
}

class FakeConsumedEvents implements ConsumedEventRepository {
  claimResult: ConsumedEventClaim = 'ACQUIRED';
  completed: string[] = [];
  released: string[] = [];

  async claim(): Promise<ConsumedEventClaim> {
    return this.claimResult;
  }

  async complete(eventId: string): Promise<boolean> {
    this.completed.push(eventId);
    return true;
  }

  async release(eventId: string): Promise<boolean> {
    this.released.push(eventId);
    return true;
  }
}

const event = (overrides: Partial<JobSemanticContentChangedEvent> = {}) => ({
  jobId: 'job-id',
  jobVersion: 2,
  outcome: 'SEMANTIC_CHANGED' as const,
  occurredAt: '2026-08-01T00:00:00.000Z',
  ...overrides,
});

describe('JobEmbeddingIndexerService', () => {
  it('generates and persists the current canonical job embedding', async () => {
    const provider = new FakeProvider();
    const embeddings = new FakeEmbeddingRepository();
    const sources = new FakeSourceRepository();
    const consumed = new FakeConsumedEvents();
    const service = new JobEmbeddingIndexerService(
      provider,
      embeddings,
      sources,
      consumed,
      'worker-a',
    );

    await expect(service.process('event-id', event())).resolves.toBe('INDEXED');
    expect(provider.calls[0]).toMatchObject({ purpose: 'DOCUMENT' });
    expect(embeddings.upserts[0]).toMatchObject({
      jobId: 'job-id',
      provider: 'groq',
      model: 'configured-model',
      jobVersion: 2,
    });
    expect(embeddings.upserts[0].contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(consumed.completed).toEqual(['event-id']);
  });

  it('skips already consumed and stale events without calling AI', async () => {
    const provider = new FakeProvider();
    const embeddings = new FakeEmbeddingRepository();
    const sources = new FakeSourceRepository();
    const consumed = new FakeConsumedEvents();
    consumed.claimResult = 'COMPLETED';
    const service = new JobEmbeddingIndexerService(
      provider,
      embeddings,
      sources,
      consumed,
      'worker-a',
    );

    await expect(service.process('done-event', event())).resolves.toBe('ALREADY_PROCESSED');
    consumed.claimResult = 'ACQUIRED';
    await expect(service.process('stale-event', event({ jobVersion: 1 }))).resolves.toBe(
      'STALE_EVENT',
    );
    expect(provider.calls).toHaveLength(0);
  });

  it('removes inactive job embeddings and completes the event', async () => {
    const provider = new FakeProvider();
    const embeddings = new FakeEmbeddingRepository();
    const sources = new FakeSourceRepository();
    if (sources.source) sources.source = { ...sources.source, status: 'EXPIRED' };
    const consumed = new FakeConsumedEvents();
    const service = new JobEmbeddingIndexerService(
      provider,
      embeddings,
      sources,
      consumed,
      'worker-a',
    );

    await expect(service.process('event-id', event())).resolves.toBe('JOB_REMOVED');
    expect(embeddings.deletes).toEqual(['job-id']);
    expect(provider.calls).toHaveLength(0);
  });

  it('skips current embeddings with matching searchable profile hash', async () => {
    const provider = new FakeProvider();
    const embeddings = new FakeEmbeddingRepository();
    const sources = new FakeSourceRepository();
    const consumed = new FakeConsumedEvents();
    if (!sources.source) throw new Error('source fixture missing');
    embeddings.current = {
      id: 'embedding-id',
      jobId: 'job-id',
      provider: 'groq',
      model: 'configured-model',
      dimensions: JOB_EMBEDDING_DIMENSIONS,
      contentHash: createJobEmbeddingContentHash(sources.source),
      jobVersion: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const service = new JobEmbeddingIndexerService(
      provider,
      embeddings,
      sources,
      consumed,
      'worker-a',
    );

    await expect(service.process('current-event', event())).resolves.toBe('ALREADY_CURRENT');
    expect(provider.calls).toHaveLength(0);
    expect(embeddings.upserts).toHaveLength(0);
  });

  it('reindexes when the searchable profile hash changes for the current job version', async () => {
    const provider = new FakeProvider();
    const embeddings = new FakeEmbeddingRepository();
    const sources = new FakeSourceRepository();
    const consumed = new FakeConsumedEvents();
    if (!sources.source) throw new Error('source fixture missing');
    embeddings.current = {
      id: 'embedding-id',
      jobId: 'job-id',
      provider: 'groq',
      model: 'configured-model',
      dimensions: JOB_EMBEDDING_DIMENSIONS,
      contentHash: createJobEmbeddingContentHash({
        ...sources.source,
        descriptionText: 'Old job description.',
      }),
      jobVersion: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const service = new JobEmbeddingIndexerService(
      provider,
      embeddings,
      sources,
      consumed,
      'worker-a',
    );

    await expect(service.process('changed-event', event())).resolves.toBe('INDEXED');
    expect(provider.calls).toHaveLength(1);
    expect(embeddings.upserts[0]).toMatchObject({
      jobId: 'job-id',
      jobVersion: 2,
      contentHash: createJobEmbeddingContentHash(sources.source),
    });
  });

  it('skips jobs outside the storage and embedding age windows', async () => {
    const provider = new FakeProvider();
    const embeddings = new FakeEmbeddingRepository();
    const sources = new FakeSourceRepository();
    const consumed = new FakeConsumedEvents();
    if (!sources.source) throw new Error('source fixture missing');
    sources.source = {
      ...sources.source,
      effectivePostedAt: new Date('2020-01-01T00:00:00.000Z'),
    };
    const service = new JobEmbeddingIndexerService(
      provider,
      embeddings,
      sources,
      consumed,
      'worker-a',
    );

    await expect(service.process('old-storage', event())).resolves.toBe(
      'SKIPPED_OUTSIDE_STORAGE_WINDOW',
    );
    expect(embeddings.deletes).toEqual(['job-id']);
    expect(provider.calls).toHaveLength(0);

    embeddings.deletes = [];
    sources.source = {
      ...sources.source,
      effectivePostedAt: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000),
    };
    await expect(service.process('old-embedding', event())).resolves.toBe(
      'SKIPPED_OUTSIDE_EMBEDDING_WINDOW',
    );
    expect(embeddings.deletes).toEqual(['job-id']);
    expect(provider.calls).toHaveLength(0);
  });

  it('batches provider calls while isolating per-event failures', async () => {
    const provider = new FakeProvider();
    const embeddings = new FakeEmbeddingRepository();
    const originalUpsert = embeddings.upsert.bind(embeddings);
    embeddings.upsert = async (input) => {
      if (input.jobId === 'job-b') throw new Error('upsert failed for job-b');
      return originalUpsert(input);
    };
    const sources = new FakeSourceRepository();
    const consumed = new FakeConsumedEvents();
    const service = new JobEmbeddingIndexerService(
      provider,
      embeddings,
      sources,
      consumed,
      'worker-a',
      30_000,
      undefined,
      32,
      200_000,
    );

    const findByJobId = sources.findByJobId.bind(sources);
    sources.findByJobId = async (jobId: string) => {
      const base = await findByJobId();
      if (!base) return null;
      return { ...base, jobId };
    };

    const results = await service.processMany([
      { eventId: 'evt-a', event: event({ jobId: 'job-a' }) },
      { eventId: 'evt-b', event: event({ jobId: 'job-b' }) },
      { eventId: 'evt-c', event: event({ jobId: 'job-c' }) },
    ]);

    expect(provider.batchCalls).toHaveLength(1);
    expect(provider.batchCalls[0]?.texts).toHaveLength(3);
    expect(results[0]).toMatchObject({ eventId: 'evt-a', outcome: 'INDEXED' });
    expect(results[1]?.error).toBeInstanceOf(Error);
    expect(results[2]).toMatchObject({ eventId: 'evt-c', outcome: 'INDEXED' });
    expect(consumed.completed).toEqual(['evt-a', 'evt-c']);
    expect(consumed.released).toEqual(['evt-b']);
  });
});
