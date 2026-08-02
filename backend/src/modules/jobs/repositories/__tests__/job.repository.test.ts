import { describe, expect, it } from 'vitest';
import { ProviderType } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import type { NormalizedJob } from '@/modules/jobs/models/NormalizedJob.js';
import { JOB_SEMANTIC_CONTENT_CHANGED_EVENT } from '@/modules/jobs/events/job.events.js';
import {
  PrismaJobRepository,
  type CanonicalJobWrite,
  type JobPersistenceTransaction,
  type JobSourceWrite,
  type JobTransactionRunner,
  type PersistedCanonicalJob,
  type PersistedJobSource,
} from '@/modules/jobs/repositories/job.repository.js';
import { JobSalaryPeriod, ProviderTier } from '@/modules/jobs/types/job.types.js';
import { env } from '@/shared/config/env.conf.js';

class MemoryTransaction implements JobPersistenceTransaction {
  private companyName: string | null = null;
  job: PersistedCanonicalJob | null = null;
  source: PersistedJobSource | null = null;
  sourceWrite: JobSourceWrite | null = null;
  failOutbox = false;
  outboxEvents: Array<{
    aggregateId: string;
    eventType: string;
    payload: Prisma.InputJsonObject;
  }> = [];

  async upsertCompany(_slug: string, name: string): Promise<{ previousName: string | null }> {
    const previousName = this.companyName;
    this.companyName = name;
    return { previousName };
  }

  async findSource(
    provider: ProviderType,
    providerJobId: string,
  ): Promise<PersistedJobSource | null> {
    return this.sourceWrite?.provider === provider &&
      this.sourceWrite.providerJobId === providerJobId
      ? this.source
      : null;
  }

  async findJobByCanonicalHash(canonicalHash: string): Promise<PersistedCanonicalJob | null> {
    return this.job?.canonicalHash === canonicalHash ? this.job : null;
  }

  lastWrite: CanonicalJobWrite | null = null;

  async upsertJob(input: CanonicalJobWrite): Promise<{ id: string; version: number }> {
    this.lastWrite = input;
    this.job = {
      id: this.job?.id ?? 'canonical-job-id',
      canonicalHash: input.canonicalHash,
      companySlug: input.companySlug,
      companyName: this.companyName ?? '',
      title: input.title,
      employmentType: null,
      remoteType: input.remoteType,
      descriptionText: input.descriptionText,
      skills: input.skills,
      tags: input.tags,
      version: input.version,
      firstSeen: this.job?.firstSeen ?? input.now,
      createdAt: this.job?.createdAt ?? input.now,
    };
    return { id: this.job.id, version: this.job.version };
  }

  async upsertSource(input: JobSourceWrite): Promise<void> {
    this.sourceWrite = input;
    if (!this.job) throw new Error('Canonical job must be written first');
    this.source = {
      applyUrl: input.applyUrl,
      priority: input.priority,
      rawMetadata: input.rawMetadata,
      job: this.job,
    };
  }

  async createOutboxEvent(
    aggregateId: string,
    eventType: string,
    payload: Prisma.InputJsonObject,
  ): Promise<void> {
    if (this.failOutbox) throw new Error('Outbox unavailable');
    this.outboxEvents.push({ aggregateId, eventType, payload });
  }
}

class MemoryRunner implements JobTransactionRunner {
  readonly transaction = new MemoryTransaction();

  async run<T>(operation: (transaction: JobPersistenceTransaction) => Promise<T>): Promise<T> {
    return operation(this.transaction);
  }
}

const makeJob = (overrides: Partial<NormalizedJob> = {}): NormalizedJob => ({
  id: 'normalized-id',
  providerJobId: 'provider-id',
  providerName: 'arbeitnow',
  providerTier: ProviderTier.PUBLIC,
  title: 'Senior Engineer',
  normalizedTitle: 'seniorengineer',
  companyName: 'Acme',
  normalizedCompany: 'acme',
  location: { raw: 'Remote', isRemote: true },
  description: 'Build reliable systems',
  applyUrl: 'https://example.test/jobs/1',
  salary: {
    min: 100_000,
    max: 150_000,
    currency: 'USD',
    period: JobSalaryPeriod.YEARLY,
  },
  tags: ['TypeScript', 'Node.js'],
  postedAt: '2026-07-31T00:00:00.000Z',
  canonicalHash: 'hash-1',
  ...overrides,
});

describe('PrismaJobRepository semantic persistence', () => {
  it('inserts a canonical job at version 1 and maps its source deterministically', async () => {
    const runner = new MemoryRunner();
    const repository = new PrismaJobRepository(runner);

    const result = await repository.upsertMany([makeJob()]);

    expect(result.outcomes[0]).toMatchObject({
      canonicalJobId: 'canonical-job-id',
      outcome: 'INSERTED',
      newVersion: 1,
    });
    expect(runner.transaction.sourceWrite).toMatchObject({
      provider: ProviderType.ARBEITNOW,
      providerJobId: 'provider-id',
      priority: 60,
      applyUrl: 'https://example.test/jobs/1',
      rawMetadata: {
        providerName: 'arbeitnow',
        providerTier: ProviderTier.PUBLIC,
      },
    });
    expect(runner.transaction.outboxEvents).toEqual([
      {
        aggregateId: 'canonical-job-id',
        eventType: JOB_SEMANTIC_CONTENT_CHANGED_EVENT,
        payload: {
          jobId: 'canonical-job-id',
          jobVersion: 1,
          outcome: 'INSERTED',
          occurredAt: expect.any(String),
        },
      },
    ]);
  });

  it('classifies exact repeats as unchanged without incrementing version', async () => {
    const runner = new MemoryRunner();
    const repository = new PrismaJobRepository(runner);
    await repository.upsertMany([makeJob()]);

    const repeated = await repository.upsertMany([makeJob()]);

    expect(repeated.outcomes[0]).toMatchObject({
      outcome: 'UNCHANGED',
      previousVersion: 1,
      newVersion: 1,
    });
    expect(runner.transaction.outboxEvents).toHaveLength(1);
  });

  it('classifies apply URL changes as metadata-only without incrementing version', async () => {
    const runner = new MemoryRunner();
    const repository = new PrismaJobRepository(runner);
    await repository.upsertMany([makeJob()]);

    const changed = await repository.upsertMany([
      makeJob({ applyUrl: 'https://example.test/jobs/1-new' }),
    ]);

    expect(changed.outcomes[0]).toMatchObject({
      outcome: 'METADATA_ONLY',
      previousVersion: 1,
      newVersion: 1,
    });
    expect(runner.transaction.outboxEvents).toHaveLength(1);
  });

  it('increments version only when an embeddable canonical field changes', async () => {
    const runner = new MemoryRunner();
    const repository = new PrismaJobRepository(runner);
    await repository.upsertMany([makeJob()]);

    const changed = await repository.upsertMany([
      makeJob({
        description: 'Build reliable distributed systems',
      }),
    ]);

    expect(changed.outcomes[0]).toMatchObject({
      outcome: 'SEMANTIC_CHANGED',
      previousVersion: 1,
      newVersion: 2,
      canonicalHash: 'hash-1',
    });
    expect(runner.transaction.outboxEvents).toHaveLength(2);
    expect(runner.transaction.outboxEvents[1]).toMatchObject({
      aggregateId: 'canonical-job-id',
      eventType: JOB_SEMANTIC_CONTENT_CHANGED_EVENT,
      payload: {
        jobId: 'canonical-job-id',
        jobVersion: 2,
        outcome: 'SEMANTIC_CHANGED',
      },
    });
  });

  it('isolates unsupported providers and returns accurate batch counts', async () => {
    const runner = new MemoryRunner();
    const repository = new PrismaJobRepository(runner);

    const result = await repository.upsertMany([
      makeJob({ providerJobId: 'unsupported-id', providerName: 'unknown' }),
      makeJob(),
    ]);

    expect(result.outcomes[0]).toMatchObject({
      providerInputId: 'unsupported-id',
      outcome: 'FAILED',
      failureCode: 'UNSUPPORTED_PROVIDER',
    });
    expect(result.summary).toEqual({
      inserted: 1,
      semanticChanged: 0,
      metadataOnly: 0,
      unchanged: 0,
      failed: 1,
      storageAgeSkipped: 0,
      embeddingAgeSkipped: 0,
    });
  });

  it('skips storage-ineligible jobs and skips embedding events for embedding-ineligible jobs', async () => {
    const envSnapshot = {
      JOB_STORAGE_AGE_FILTER_ENABLED: env.JOB_STORAGE_AGE_FILTER_ENABLED,
      JOB_STORAGE_MAX_AGE_MONTHS: env.JOB_STORAGE_MAX_AGE_MONTHS,
      JOB_EMBEDDING_AGE_FILTER_ENABLED: env.JOB_EMBEDDING_AGE_FILTER_ENABLED,
      JOB_EMBEDDING_MAX_AGE_MONTHS: env.JOB_EMBEDDING_MAX_AGE_MONTHS,
    };
    Object.assign(env, {
      JOB_STORAGE_AGE_FILTER_ENABLED: true,
      JOB_STORAGE_MAX_AGE_MONTHS: 3,
      JOB_EMBEDDING_AGE_FILTER_ENABLED: true,
      JOB_EMBEDDING_MAX_AGE_MONTHS: 2,
    });

    try {
      const runner = new MemoryRunner();
      const repository = new PrismaJobRepository(runner);

      const storageSkipped = await repository.upsertMany([
        makeJob({
          providerJobId: 'old-job',
          postedAt: '2020-01-01T00:00:00.000Z',
          canonicalHash: 'hash-old',
        }),
      ]);
      expect(storageSkipped.outcomes[0]?.outcome).toBe('STORAGE_AGE_SKIPPED');
      expect(storageSkipped.summary.storageAgeSkipped).toBe(1);
      expect(runner.transaction.outboxEvents).toHaveLength(0);

      // Within storage (3mo) but outside embedding (2mo) relative to today (2026-08-03)
      const embeddingSkipped = await repository.upsertMany([
        makeJob({
          providerJobId: 'mid-age-job',
          postedAt: '2026-05-15T00:00:00.000Z',
          canonicalHash: 'hash-mid',
        }),
      ]);
      expect(embeddingSkipped.outcomes[0]?.outcome).toBe('EMBEDDING_AGE_SKIPPED');
      expect(embeddingSkipped.summary.embeddingAgeSkipped).toBe(1);
      expect(runner.transaction.lastWrite?.effectivePostedAt).toEqual(
        new Date('2026-05-15T00:00:00.000Z'),
      );
      expect(runner.transaction.outboxEvents).toHaveLength(0);
    } finally {
      Object.assign(env, envSnapshot);
    }
  });

  it('reports persistence failure when the transactional outbox write fails', async () => {
    const runner = new MemoryRunner();
    runner.transaction.failOutbox = true;
    const repository = new PrismaJobRepository(runner);

    const result = await repository.upsertMany([makeJob()]);

    expect(result.outcomes[0]).toMatchObject({
      outcome: 'FAILED',
      failureCode: 'JOB_PERSISTENCE_FAILED',
    });
    expect(result.summary.failed).toBe(1);
  });
});
