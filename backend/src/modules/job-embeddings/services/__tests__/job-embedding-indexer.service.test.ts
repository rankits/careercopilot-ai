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

  async generateEmbedding(text: string, purpose?: EmbeddingPurpose): Promise<number[]> {
    this.calls.push({ text, purpose });
    return Array(this.dimensions).fill(0.1);
  }

  async generateEmbeddings(
    texts: readonly string[],
    purpose?: EmbeddingPurpose,
  ): Promise<number[][]> {
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
});
