import { JobStatus, Prisma, ProviderType } from '@prisma/client';
import { prisma } from '@/shared/config/db.conf.js';
import { IJobRepository } from '@/modules/jobs/interfaces/IJobRepository.js';
import { NormalizedJob } from '@/modules/jobs/models/NormalizedJob.js';
import {
  JobSearchFilters,
  PaginationOptions,
  PaginatedResult,
} from '@/modules/jobs/types/job.types.js';
import { ProviderTier } from '@/modules/jobs/types/job.types.js';
import type {
  JobPersistenceBatchResult,
  JobPersistenceBatchSummary,
  JobPersistenceOutcome,
  JobPersistenceResult,
} from '@/modules/jobs/types/job-persistence.types.js';
import {
  JOB_SEMANTIC_CONTENT_CHANGED_EVENT,
  type JobSemanticContentChangedEvent,
} from '@/modules/jobs/events/job.events.js';
import { serializeJobSemanticContent } from '@/modules/jobs/utils/job-semantic-content.js';
import { jobsLogger } from '@/shared/utils/logger.js';

export interface PersistedCanonicalJob {
  id: string;
  canonicalHash: string;
  companySlug: string;
  companyName: string;
  title: string;
  employmentType: string | null;
  remoteType: string | null;
  descriptionText: string;
  skills: unknown;
  tags: unknown;
  version: number;
}

export interface PersistedJobSource {
  applyUrl: string | null;
  priority: number;
  rawMetadata: unknown;
  job: PersistedCanonicalJob;
}

export interface CanonicalJobWrite {
  lookupHash: string;
  canonicalHash: string;
  companySlug: string;
  title: string;
  remoteType: string;
  descriptionHtml: string;
  descriptionText: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  skills: Prisma.InputJsonArray;
  benefits: Prisma.InputJsonArray;
  tags: Prisma.InputJsonArray;
  providerMetadata: Prisma.InputJsonObject;
  postedAt: Date;
  version: number;
  now: Date;
}

export interface JobSourceWrite {
  jobId: string;
  provider: ProviderType;
  providerJobId: string;
  priority: number;
  applyUrl: string;
  rawMetadata: Prisma.InputJsonObject;
}

export interface JobPersistenceTransaction {
  upsertCompany(slug: string, name: string): Promise<{ previousName: string | null }>;
  findSource(provider: ProviderType, providerJobId: string): Promise<PersistedJobSource | null>;
  findJobByCanonicalHash(canonicalHash: string): Promise<PersistedCanonicalJob | null>;
  upsertJob(input: CanonicalJobWrite): Promise<{ id: string; version: number }>;
  upsertSource(input: JobSourceWrite): Promise<void>;
  createOutboxEvent(
    aggregateId: string,
    eventType: string,
    payload: Prisma.InputJsonObject,
  ): Promise<void>;
}

export interface JobTransactionRunner {
  run<T>(operation: (transaction: JobPersistenceTransaction) => Promise<T>): Promise<T>;
}

const toPersistedJob = (job: {
  id: string;
  canonicalHash: string;
  companySlug: string;
  title: string;
  employmentType: string | null;
  remoteType: string | null;
  descriptionText: string;
  skills: Prisma.JsonValue;
  tags: Prisma.JsonValue;
  providerMetadata: Prisma.JsonValue;
  version: number;
  company: { name: string };
}): PersistedCanonicalJob => {
  const metadata =
    typeof job.providerMetadata === 'object' &&
    job.providerMetadata !== null &&
    !Array.isArray(job.providerMetadata)
      ? job.providerMetadata
      : {};
  const semanticCompanyName = metadata.semanticCompanyName;
  return {
    id: job.id,
    canonicalHash: job.canonicalHash,
    companySlug: job.companySlug,
    companyName: typeof semanticCompanyName === 'string' ? semanticCompanyName : job.company.name,
    title: job.title,
    employmentType: job.employmentType,
    remoteType: job.remoteType,
    descriptionText: job.descriptionText,
    skills: job.skills,
    tags: job.tags,
    version: job.version,
  };
};

class PrismaJobPersistenceTransaction implements JobPersistenceTransaction {
  constructor(private readonly transaction: Prisma.TransactionClient) {}

  async upsertCompany(slug: string, name: string): Promise<{ previousName: string | null }> {
    const previous = await this.transaction.company.findUnique({
      where: { slug },
      select: { name: true },
    });
    await this.transaction.company.upsert({
      where: { slug },
      create: { slug, name },
      update: { name },
    });
    return { previousName: previous?.name ?? null };
  }

  async findSource(
    provider: ProviderType,
    providerJobId: string,
  ): Promise<PersistedJobSource | null> {
    const source = await this.transaction.jobSource.findUnique({
      where: { provider_providerJobId: { provider, providerJobId } },
      include: { job: { include: { company: true } } },
    });
    if (!source) return null;
    return {
      applyUrl: source.applyUrl,
      priority: source.priority,
      rawMetadata: source.rawMetadata,
      job: toPersistedJob(source.job),
    };
  }

  async findJobByCanonicalHash(canonicalHash: string): Promise<PersistedCanonicalJob | null> {
    const job = await this.transaction.job.findUnique({
      where: { canonicalHash },
      include: { company: true },
    });
    return job ? toPersistedJob(job) : null;
  }

  async upsertJob(input: CanonicalJobWrite): Promise<{ id: string; version: number }> {
    return this.transaction.job.upsert({
      where: { canonicalHash: input.lookupHash },
      create: {
        canonicalHash: input.canonicalHash,
        companySlug: input.companySlug,
        title: input.title,
        descriptionHtml: input.descriptionHtml,
        descriptionText: input.descriptionText,
        remoteType: input.remoteType,
        salaryMin: input.salaryMin,
        salaryMax: input.salaryMax,
        currency: input.currency,
        skills: input.skills,
        benefits: input.benefits,
        tags: input.tags,
        providerMetadata: input.providerMetadata,
        status: JobStatus.ACTIVE,
        postedAt: input.postedAt,
        version: input.version,
        lastSeen: input.now,
        lastChecked: input.now,
      },
      update: {
        canonicalHash: input.canonicalHash,
        companySlug: input.companySlug,
        title: input.title,
        descriptionHtml: input.descriptionHtml,
        descriptionText: input.descriptionText,
        remoteType: input.remoteType,
        salaryMin: input.salaryMin,
        salaryMax: input.salaryMax,
        currency: input.currency,
        skills: input.skills,
        benefits: input.benefits,
        tags: input.tags,
        providerMetadata: input.providerMetadata,
        status: JobStatus.ACTIVE,
        postedAt: input.postedAt,
        version: input.version,
        lastSeen: input.now,
        lastChecked: input.now,
      },
      select: { id: true, version: true },
    });
  }

  async upsertSource(input: JobSourceWrite): Promise<void> {
    await this.transaction.jobSource.upsert({
      where: {
        provider_providerJobId: {
          provider: input.provider,
          providerJobId: input.providerJobId,
        },
      },
      create: input,
      update: {
        jobId: input.jobId,
        priority: input.priority,
        applyUrl: input.applyUrl,
        rawMetadata: input.rawMetadata,
      },
    });
  }

  async createOutboxEvent(
    aggregateId: string,
    eventType: string,
    payload: Prisma.InputJsonObject,
  ): Promise<void> {
    await this.transaction.outboxEvent.create({
      data: {
        aggregateId,
        eventType,
        payload,
      },
    });
  }
}

class PrismaJobTransactionRunner implements JobTransactionRunner {
  run<T>(operation: (transaction: JobPersistenceTransaction) => Promise<T>): Promise<T> {
    return prisma.$transaction((transaction) =>
      operation(new PrismaJobPersistenceTransaction(transaction)),
    );
  }
}

class UnsupportedProviderError extends Error {}
class InvalidJobInputError extends Error {}

const PROVIDER_NAME_TO_TYPE: Record<string, ProviderType> = {
  greenhouse: 'GREENHOUSE',
  lever: 'LEVER',
  arbeitnow: 'ARBEITNOW',
  public_feed: 'ARBEITNOW',
  remotive: 'REMOTIVE',
  jobicy: 'JOBICY',
  himalayas: 'HIMALAYAS',
  remoteok: 'REMOTEOK',
  remotejobs_org: 'REMOTEJOBS_ORG',
  'remotejobs.org': 'REMOTEJOBS_ORG',
  ashby: 'ASHBY',
  recruitee: 'RECRUITEE',
  personio: 'PERSONIO',
};

const mapProvider = (providerName: string): ProviderType => {
  const normalized = providerName.trim().toLowerCase();
  const provider = PROVIDER_NAME_TO_TYPE[normalized];
  // Use string literals (not ProviderType.X) so a stale generated client
  // missing new enum keys cannot silently pass `undefined` into Prisma.
  if (!provider) {
    throw new UnsupportedProviderError(`Unsupported job provider: ${providerName}`);
  }
  return provider;
};

const priorityForTier = (tier: ProviderTier): number => {
  if (tier === ProviderTier.PAID_AUTH) return 100;
  if (tier === ProviderTier.FREE_AUTH) return 80;
  return 60;
};

const metadataMatches = (
  source: PersistedJobSource | null,
  applyUrl: string,
  priority: number,
  rawMetadata: Prisma.InputJsonObject,
): boolean =>
  source !== null &&
  source.applyUrl === applyUrl &&
  source.priority === priority &&
  JSON.stringify(source.rawMetadata) === JSON.stringify(rawMetadata);

const emptySummary = () => ({
  inserted: 0,
  semanticChanged: 0,
  metadataOnly: 0,
  unchanged: 0,
  failed: 0,
});

const summarize = (outcomes: JobPersistenceResult[]): JobPersistenceBatchSummary => {
  const summary = emptySummary();
  for (const result of outcomes) {
    if (result.outcome === 'INSERTED') summary.inserted++;
    else if (result.outcome === 'SEMANTIC_CHANGED') summary.semanticChanged++;
    else if (result.outcome === 'METADATA_ONLY') summary.metadataOnly++;
    else if (result.outcome === 'UNCHANGED') summary.unchanged++;
    else summary.failed++;
  }
  return summary;
};

export class PrismaJobRepository implements IJobRepository {
  constructor(
    private readonly transactionRunner: JobTransactionRunner = new PrismaJobTransactionRunner(),
  ) {}

  async upsertMany(jobs: NormalizedJob[]): Promise<JobPersistenceBatchResult> {
    const outcomes: JobPersistenceResult[] = [];

    for (const job of jobs) {
      try {
        const result = await this.persistOne(job);
        outcomes.push(result);
      } catch (error) {
        const unsupportedProvider = error instanceof UnsupportedProviderError;
        const invalidInput = error instanceof InvalidJobInputError;
        const failureCode = unsupportedProvider
          ? 'UNSUPPORTED_PROVIDER'
          : invalidInput
            ? 'INVALID_JOB_INPUT'
            : 'JOB_PERSISTENCE_FAILED';
        const failureMessage =
          unsupportedProvider || invalidInput ? error.message : 'Job persistence failed';
        outcomes.push({
          providerInputId: job.providerJobId,
          canonicalHash: job.canonicalHash,
          outcome: 'FAILED',
          failureCode,
          failureMessage,
        });
        jobsLogger.error(
          { jobId: job.id, providerInputId: job.providerJobId, failureCode },
          'Failed to persist job',
        );
      }
    }

    return { outcomes, summary: summarize(outcomes) };
  }

  private async persistOne(job: NormalizedJob): Promise<JobPersistenceResult> {
    const provider = mapProvider(job.providerName);
    const postedAt = new Date(job.postedAt);
    if (Number.isNaN(postedAt.getTime())) {
      throw new InvalidJobInputError('Job postedAt must be a valid ISO date');
    }

    const priority = priorityForTier(job.providerTier);
    const rawMetadata: Prisma.InputJsonObject = {
      providerName: job.providerName,
      providerTier: job.providerTier,
    };
    const providerMetadata: Prisma.InputJsonObject = {
      latestProvider: job.providerName,
      latestProviderTier: job.providerTier,
      semanticCompanyName: job.companyName,
    };
    const skills: Prisma.InputJsonArray = [...job.tags];
    const tags: Prisma.InputJsonArray = [...job.tags];
    const benefits: Prisma.InputJsonArray = [];

    return this.transactionRunner.run(async (transaction) => {
      await transaction.upsertCompany(job.normalizedCompany, job.companyName);
      const source = await transaction.findSource(provider, job.providerJobId);
      const hashMatch = source ? null : await transaction.findJobByCanonicalHash(job.canonicalHash);
      const existing = source?.job ?? hashMatch;

      const incomingSemantic = serializeJobSemanticContent({
        companySlug: job.normalizedCompany,
        companyName: job.companyName,
        title: job.title,
        descriptionText: job.description,
        remoteType: job.location.isRemote ? 'REMOTE' : 'ONSITE',
        skills,
        tags,
        employmentType: null,
      });
      const semanticChanged =
        existing !== null && serializeJobSemanticContent(existing) !== incomingSemantic;
      const sourceUnchanged = metadataMatches(source, job.applyUrl, priority, rawMetadata);
      const outcome: JobPersistenceOutcome =
        existing === null
          ? 'INSERTED'
          : semanticChanged
            ? 'SEMANTIC_CHANGED'
            : sourceUnchanged
              ? 'UNCHANGED'
              : 'METADATA_ONLY';
      const previousVersion = existing?.version;
      const newVersion =
        existing === null ? 1 : semanticChanged ? existing.version + 1 : existing.version;
      const now = new Date();
      const persisted = await transaction.upsertJob({
        lookupHash: existing?.canonicalHash ?? job.canonicalHash,
        canonicalHash: job.canonicalHash,
        companySlug: job.normalizedCompany,
        title: job.title,
        descriptionHtml: job.description,
        descriptionText: job.description,
        remoteType: job.location.isRemote ? 'REMOTE' : 'ONSITE',
        salaryMin: job.salary?.min,
        salaryMax: job.salary?.max,
        currency: job.salary?.currency,
        skills,
        benefits,
        tags,
        providerMetadata,
        postedAt,
        version: newVersion,
        now,
      });
      await transaction.upsertSource({
        jobId: persisted.id,
        provider,
        providerJobId: job.providerJobId,
        priority,
        applyUrl: job.applyUrl,
        rawMetadata,
      });
      if (outcome === 'INSERTED' || outcome === 'SEMANTIC_CHANGED') {
        const event: JobSemanticContentChangedEvent = {
          jobId: persisted.id,
          jobVersion: persisted.version,
          outcome,
          occurredAt: now.toISOString(),
        };
        await transaction.createOutboxEvent(persisted.id, JOB_SEMANTIC_CONTENT_CHANGED_EVENT, {
          ...event,
        });
      }

      return {
        providerInputId: job.providerJobId,
        canonicalJobId: persisted.id,
        canonicalHash: job.canonicalHash,
        outcome,
        previousVersion,
        newVersion: persisted.version,
      };
    });
  }

  async findById(id: string): Promise<NormalizedJob | null> {
    throw new Error('Method not implemented in ingestion repository.');
  }

  async search(
    filters: JobSearchFilters,
    pagination: PaginationOptions,
  ): Promise<PaginatedResult<NormalizedJob>> {
    throw new Error(
      'Method not implemented in ingestion repository. Use job-listing module instead.',
    );
  }

  async deleteExpiredBefore(timestamp: string): Promise<{ count: number }> {
    // Schema doesn't have expiresAt, we can check based on lastSeen instead.
    const result = await prisma.job.deleteMany({
      where: {
        lastSeen: {
          lt: new Date(timestamp),
        },
      },
    });
    return { count: result.count };
  }
}
