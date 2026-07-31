import { randomUUID } from 'node:crypto';
import { JobStatus, Prisma } from '@prisma/client';
import type { JobEmbeddingBackfillRepository } from '@/modules/job-embeddings/contracts/job-embedding-backfill.repository.js';
import type {
  JobEmbeddingBackfillBatch,
  JobEmbeddingBackfillCandidate,
} from '@/modules/job-embeddings/types/job-embedding-backfill.types.js';
import {
  JOB_SEMANTIC_CONTENT_CHANGED_EVENT,
  type JobSemanticContentChangedEvent,
} from '@/modules/jobs/events/job.events.js';
import { prisma } from '@/shared/config/db.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

interface ScanRow {
  jobId: string;
  jobVersion: number;
  companySlug: string;
  companyName: string;
  title: string;
  descriptionText: string;
  remoteType: string | null;
  employmentType: string | null;
  skills: Prisma.JsonValue;
  tags: Prisma.JsonValue;
  providerMetadata: Prisma.JsonValue;
  currentContentHash: string | null;
  currentJobVersion: number | null;
  currentDimensions: number | null;
}

export interface JobEmbeddingBackfillSqlExecutor {
  query<T>(statement: Prisma.Sql): Promise<T[]>;
  execute(statement: Prisma.Sql): Promise<number>;
}

class PrismaJobEmbeddingBackfillSqlExecutor implements JobEmbeddingBackfillSqlExecutor {
  query<T>(statement: Prisma.Sql): Promise<T[]> {
    return prisma.$queryRaw<T[]>(statement);
  }

  execute(statement: Prisma.Sql): Promise<number> {
    return prisma.$executeRaw(statement);
  }
}

const resolveCompanyName = (row: ScanRow): string => {
  const metadata =
    typeof row.providerMetadata === 'object' &&
    row.providerMetadata !== null &&
    !Array.isArray(row.providerMetadata)
      ? row.providerMetadata
      : {};
  const semanticCompanyName = (metadata as Record<string, unknown>).semanticCompanyName;
  return typeof semanticCompanyName === 'string' ? semanticCompanyName : row.companyName;
};

const toCandidate = (row: ScanRow): JobEmbeddingBackfillCandidate => ({
  jobId: row.jobId,
  jobVersion: row.jobVersion,
  companySlug: row.companySlug,
  companyName: resolveCompanyName(row),
  title: row.title,
  descriptionText: row.descriptionText,
  remoteType: row.remoteType,
  employmentType: row.employmentType,
  skills: row.skills,
  tags: row.tags,
  currentContentHash: row.currentContentHash,
  currentJobVersion: row.currentJobVersion,
  currentDimensions: row.currentDimensions,
});

export class PrismaJobEmbeddingBackfillRepository implements JobEmbeddingBackfillRepository {
  constructor(
    private readonly sql: JobEmbeddingBackfillSqlExecutor = new PrismaJobEmbeddingBackfillSqlExecutor(),
  ) {}

  async scanActiveJobs(input: {
    provider: string;
    model: string;
    batchSize: number;
    afterJobId?: string;
  }): Promise<JobEmbeddingBackfillBatch> {
    if (!Number.isInteger(input.batchSize) || input.batchSize < 1) {
      throw new AppError(
        'batchSize must be a positive integer',
        422,
        'INVALID_BACKFILL_BATCH_SIZE',
      );
    }
    const provider = input.provider.trim();
    const model = input.model.trim();
    if (!provider || !model) {
      throw new AppError(
        'provider and model are required for embedding backfill',
        422,
        'INVALID_BACKFILL_PROVIDER',
      );
    }

    const cursorFilter = input.afterJobId
      ? Prisma.sql`AND j."id" > ${input.afterJobId}`
      : Prisma.empty;

    const rows = await this.sql.query<ScanRow>(Prisma.sql`
      SELECT
        j."id" AS "jobId",
        j."version" AS "jobVersion",
        j."company_slug" AS "companySlug",
        c."name" AS "companyName",
        j."title",
        j."description_text" AS "descriptionText",
        j."remote_type" AS "remoteType",
        j."employment_type" AS "employmentType",
        j."skills",
        j."tags",
        j."provider_metadata" AS "providerMetadata",
        je."content_hash" AS "currentContentHash",
        je."job_version" AS "currentJobVersion",
        je."dimensions" AS "currentDimensions"
      FROM "jobs" j
      INNER JOIN "companies" c ON c."slug" = j."company_slug"
      LEFT JOIN "job_embeddings" je
        ON je."job_id" = j."id"
       AND je."provider" = ${provider}
       AND je."model" = ${model}
      WHERE j."status" = ${JobStatus.ACTIVE}::"JobStatus"
        ${cursorFilter}
      ORDER BY j."id" ASC
      LIMIT ${input.batchSize}
    `);

    const candidates = rows.map(toCandidate);
    return {
      candidates,
      nextCursorJobId: candidates.at(-1)?.jobId,
    };
  }

  async enqueueSemanticChange(event: JobSemanticContentChangedEvent): Promise<void> {
    await this.sql.execute(Prisma.sql`
      INSERT INTO "outbox_events" (
        "id",
        "aggregate_id",
        "event_type",
        "payload",
        "status",
        "attempt_count",
        "next_attempt_at",
        "created_at"
      )
      VALUES (
        ${randomUUID()},
        ${event.jobId},
        ${JOB_SEMANTIC_CONTENT_CHANGED_EVENT},
        CAST(${JSON.stringify(event)} AS jsonb),
        'PENDING'::"EventStatus",
        0,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `);
  }
}
