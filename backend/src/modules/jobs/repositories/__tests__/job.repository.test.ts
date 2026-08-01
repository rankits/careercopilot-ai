import { describe, expect, it } from 'vitest';
import { ProviderType } from '@prisma/client';
import type { NormalizedJob } from '@/modules/jobs/models/NormalizedJob.js';
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

class MemoryTransaction implements JobPersistenceTransaction {
  private companyName: string | null = null;
  job: PersistedCanonicalJob | null = null;
  source: PersistedJobSource | null = null;
  sourceWrite: JobSourceWrite | null = null;

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

  async upsertJob(input: CanonicalJobWrite): Promise<{ id: string; version: number }> {
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
    });
  });
});
