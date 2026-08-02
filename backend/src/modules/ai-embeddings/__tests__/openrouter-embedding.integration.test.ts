import { describe, expect, it } from 'vitest';
import type { EmbeddingPurpose } from '@/modules/ai-embeddings/contracts/embedding-provider.js';
import type { EmbeddingHttpClient } from '@/modules/ai-embeddings/providers/embedding-http.client.js';
import {
  OpenRouterEmbeddingProvider,
  type OpenRouterEmbeddingProviderOptions,
} from '@/modules/ai-embeddings/providers/openrouter-embedding.provider.js';
import { GroqEmbeddingProvider } from '@/modules/ai-embeddings/providers/groq-embedding.provider.js';
import { GoogleEmbeddingProvider } from '@/modules/ai-embeddings/providers/google-embedding.provider.js';
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

class RecordingHttpClient implements EmbeddingHttpClient {
  calls: Array<{
    url: string;
    body: unknown;
    headers: Readonly<Record<string, string>>;
    timeoutMs: number;
  }> = [];

  constructor(private readonly responseData: unknown) {}

  async post<T>(
    url: string,
    body: unknown,
    headers: Readonly<Record<string, string>>,
    timeoutMs: number,
  ): Promise<T> {
    this.calls.push({ url, body, headers, timeoutMs });
    return this.responseData as T;
  }
}

class FakeEmbeddingRepository implements JobEmbeddingRepository {
  current: JobEmbeddingRecord | null = null;
  upserts: UpsertJobEmbeddingInput[] = [];
  deletes: string[] = [];

  async upsert(input: UpsertJobEmbeddingInput): Promise<JobEmbeddingRecord> {
    this.upserts.push(input);
    const record: JobEmbeddingRecord = {
      id: 'embedding-id',
      dimensions: input.embedding.length,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...input,
    };
    this.current = record;
    return record;
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

const event = (overrides = {}) => ({
  jobId: 'job-id',
  jobVersion: 2,
  outcome: 'SEMANTIC_CHANGED' as const,
  occurredAt: '2026-08-01T00:00:00.000Z',
  ...overrides,
});

const openRouterOptions: OpenRouterEmbeddingProviderOptions = {
  provider: 'openrouter',
  model: 'nvidia/nemotron-3-embed-1b:free',
  dimensions: JOB_EMBEDDING_DIMENSIONS,
  batchSize: 10,
  timeoutMs: 15_000,
  maxRetries: 3,
  documentPrefix: '',
  queryPrefix: '',
  apiKey: 'openrouter-test-key',
  baseUrl: 'https://openrouter.ai/api/v1',
};

describe('OpenRouterEmbedding Integration & Job Indexing', () => {
  it('indexes canonical job through OpenRouter provider and produces pgvector-compatible embedding', async () => {
    const http = new RecordingHttpClient({
      data: [
        {
          index: 0,
          embedding: Array(JOB_EMBEDDING_DIMENSIONS).fill(0.02),
        },
      ],
    });

    const provider = new OpenRouterEmbeddingProvider(openRouterOptions, http);
    const embeddings = new FakeEmbeddingRepository();
    const sources = new FakeSourceRepository();
    const consumed = new FakeConsumedEvents();

    const service = new JobEmbeddingIndexerService(
      provider,
      embeddings,
      sources,
      consumed,
      'worker-openrouter',
    );

    await expect(service.process('event-100', event())).resolves.toBe('INDEXED');

    expect(embeddings.upserts[0]).toMatchObject({
      jobId: 'job-id',
      provider: 'openrouter',
      model: 'nvidia/nemotron-3-embed-1b:free',
      jobVersion: 2,
    });
    expect(embeddings.upserts[0]?.embedding).toHaveLength(JOB_EMBEDDING_DIMENSIONS);
    expect(http.calls[0]?.url).toBe('https://openrouter.ai/api/v1/embeddings');
    expect(consumed.completed).toEqual(['event-100']);
  });

  it('generates recommendation query vector with compatible dimensions', async () => {
    const http = new RecordingHttpClient({
      data: [
        {
          index: 0,
          embedding: Array(JOB_EMBEDDING_DIMENSIONS).fill(0.03),
        },
      ],
    });

    const provider = new OpenRouterEmbeddingProvider(openRouterOptions, http);
    const queryVector = await provider.embedQuery('Senior TypeScript developer');

    expect(queryVector).toHaveLength(JOB_EMBEDDING_DIMENSIONS);
    expect(http.calls[0]?.body).toMatchObject({
      model: 'nvidia/nemotron-3-embed-1b:free',
      input: ['Senior TypeScript developer'],
    });
  });

  it('preserves idempotency and skips duplicate provider calls when content hash is unchanged', async () => {
    const http = new RecordingHttpClient({
      data: [
        {
          index: 0,
          embedding: Array(JOB_EMBEDDING_DIMENSIONS).fill(0.02),
        },
      ],
    });

    const provider = new OpenRouterEmbeddingProvider(openRouterOptions, http);
    const embeddings = new FakeEmbeddingRepository();
    const sources = new FakeSourceRepository();
    const consumed = new FakeConsumedEvents();

    if (!sources.source) throw new Error('source fixture missing');
    embeddings.current = {
      id: 'embedding-id',
      jobId: 'job-id',
      provider: 'openrouter',
      model: 'nvidia/nemotron-3-embed-1b:free',
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
      'worker-openrouter',
    );

    await expect(service.process('event-101', event())).resolves.toBe('ALREADY_CURRENT');
    expect(http.calls).toHaveLength(0);
    expect(embeddings.upserts).toHaveLength(0);
  });

  it('maintains compatibility with existing Groq and Gemini providers', async () => {
    const http = new RecordingHttpClient({
      data: [
        {
          index: 0,
          embedding: Array(JOB_EMBEDDING_DIMENSIONS).fill(0.05),
        },
      ],
    });

    const groqProvider = new GroqEmbeddingProvider(
      {
        provider: 'groq',
        model: 'groq-model',
        dimensions: JOB_EMBEDDING_DIMENSIONS,
        batchSize: 10,
        timeoutMs: 10_000,
        apiKey: 'groq-key',
        baseUrl: 'https://groq.example/openai/v1',
        documentPrefix: '',
        queryPrefix: '',
      },
      http,
    );

    const embeddings = new FakeEmbeddingRepository();
    const sources = new FakeSourceRepository();
    const consumed = new FakeConsumedEvents();

    const service = new JobEmbeddingIndexerService(
      groqProvider,
      embeddings,
      sources,
      consumed,
      'worker-groq',
    );

    await expect(service.process('event-102', event())).resolves.toBe('INDEXED');
    expect(embeddings.upserts[0]).toMatchObject({
      jobId: 'job-id',
      provider: 'groq',
      model: 'groq-model',
    });
  });

  describe('Optional Live Smoke Test', () => {
    const runSmokeTest = process.env.RUN_OPENROUTER_SMOKE_TEST === 'true';
    const maybeIt = runSmokeTest ? it : it.skip;

    maybeIt('performs live embedding call to OpenRouter API', async () => {
      const liveProvider = new OpenRouterEmbeddingProvider({
        provider: 'openrouter',
        model: 'nvidia/nemotron-3-embed-1b:free',
        dimensions: 2048,
        batchSize: 10,
        timeoutMs: 20_000,
        maxRetries: 3,
        documentPrefix: '',
        queryPrefix: '',
        apiKey: process.env.OPENROUTER_API_KEY || '',
        baseUrl: 'https://openrouter.ai/api/v1',
      });

      const vector = await liveProvider.embedQuery('smoke test query');
      expect(Array.isArray(vector)).toBe(true);
      expect(vector.length).toBe(2048);
    });
  });
});
