import { randomUUID } from 'node:crypto';
import { JobStatus, Prisma } from '@prisma/client';
import type { JobEmbeddingRepository } from '@/modules/job-embeddings/contracts/job-embedding.repository.js';
import {
  JOB_EMBEDDING_DEFAULT_SEARCH_LIMIT,
  JOB_EMBEDDING_DIMENSIONS,
  JOB_EMBEDDING_MAX_SEARCH_LIMIT,
} from '@/modules/job-embeddings/constants/job-embedding.constants.js';
import type {
  JobEmbeddingRecord,
  JobEmbeddingSearchResult,
  SearchJobEmbeddingsInput,
  UpsertJobEmbeddingInput,
} from '@/modules/job-embeddings/types/job-embedding.types.js';
import { prisma } from '@/shared/config/db.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

interface JobEmbeddingRow {
  id: string;
  jobId: string;
  provider: string;
  model: string;
  dimensions: number;
  contentHash: string;
  jobVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

interface SearchResultRow {
  jobId: string;
  similarity: number | string;
}

export interface JobEmbeddingSqlExecutor {
  query<T>(statement: Prisma.Sql): Promise<T[]>;
  execute(statement: Prisma.Sql): Promise<number>;
}

class PrismaJobEmbeddingSqlExecutor implements JobEmbeddingSqlExecutor {
  query<T>(statement: Prisma.Sql): Promise<T[]> {
    return prisma.$queryRaw<T[]>(statement);
  }

  execute(statement: Prisma.Sql): Promise<number> {
    return prisma.$executeRaw(statement);
  }
}

const validateText = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new AppError(`${field} is required`, 422, 'INVALID_JOB_EMBEDDING_INPUT');
  }
  return normalized;
};

const validateEmbedding = (embedding: readonly number[]): string => {
  if (embedding.length !== JOB_EMBEDDING_DIMENSIONS) {
    throw new AppError(
      `Embedding must contain ${JOB_EMBEDDING_DIMENSIONS} dimensions`,
      422,
      'INVALID_JOB_EMBEDDING_DIMENSIONS',
    );
  }
  if (embedding.some((value) => !Number.isFinite(value))) {
    throw new AppError('Embedding contains a non-finite value', 422, 'INVALID_JOB_EMBEDDING_VALUE');
  }
  return `[${embedding.join(',')}]`;
};

const validateContentHash = (contentHash: string): string => {
  const normalized = contentHash.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new AppError(
      'contentHash must be a SHA-256 hexadecimal digest',
      422,
      'INVALID_JOB_EMBEDDING_CONTENT_HASH',
    );
  }
  return normalized;
};

const toRecord = (row: JobEmbeddingRow): JobEmbeddingRecord => ({ ...row });

export class PrismaJobEmbeddingRepository implements JobEmbeddingRepository {
  constructor(
    private readonly sql: JobEmbeddingSqlExecutor = new PrismaJobEmbeddingSqlExecutor(),
  ) {}

  async upsert(input: UpsertJobEmbeddingInput): Promise<JobEmbeddingRecord> {
    const jobId = validateText(input.jobId, 'jobId');
    const provider = validateText(input.provider, 'provider');
    const model = validateText(input.model, 'model');
    const contentHash = validateContentHash(input.contentHash);
    const vector = validateEmbedding(input.embedding);
    if (!Number.isInteger(input.jobVersion) || input.jobVersion < 1) {
      throw new AppError(
        'jobVersion must be a positive integer',
        422,
        'INVALID_JOB_EMBEDDING_VERSION',
      );
    }

    const rows = await this.sql.query<JobEmbeddingRow>(Prisma.sql`
      INSERT INTO "job_embeddings" (
        "id",
        "job_id",
        "provider",
        "model",
        "dimensions",
        "content_hash",
        "job_version",
        "embedding",
        "created_at",
        "updated_at"
      )
      VALUES (
        ${randomUUID()},
        ${jobId},
        ${provider},
        ${model},
        ${JOB_EMBEDDING_DIMENSIONS},
        ${contentHash},
        ${input.jobVersion},
        CAST(${vector} AS vector),
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("job_id", "provider", "model")
      DO UPDATE SET
        "dimensions" = EXCLUDED."dimensions",
        "content_hash" = EXCLUDED."content_hash",
        "job_version" = EXCLUDED."job_version",
        "embedding" = EXCLUDED."embedding",
        "updated_at" = CURRENT_TIMESTAMP
      RETURNING
        "id",
        "job_id" AS "jobId",
        "provider",
        "model",
        "dimensions",
        "content_hash" AS "contentHash",
        "job_version" AS "jobVersion",
        "created_at" AS "createdAt",
        "updated_at" AS "updatedAt"
    `);

    const row = rows[0];
    if (!row) {
      throw new AppError(
        'Job embedding could not be persisted',
        500,
        'JOB_EMBEDDING_PERSISTENCE_FAILED',
      );
    }
    return toRecord(row);
  }

  async findCurrent(
    jobIdInput: string,
    providerInput: string,
    modelInput: string,
  ): Promise<JobEmbeddingRecord | null> {
    const jobId = validateText(jobIdInput, 'jobId');
    const provider = validateText(providerInput, 'provider');
    const model = validateText(modelInput, 'model');
    const rows = await this.sql.query<JobEmbeddingRow>(Prisma.sql`
      SELECT
        je."id",
        je."job_id" AS "jobId",
        je."provider",
        je."model",
        je."dimensions",
        je."content_hash" AS "contentHash",
        je."job_version" AS "jobVersion",
        je."created_at" AS "createdAt",
        je."updated_at" AS "updatedAt"
      FROM "job_embeddings" je
      INNER JOIN "jobs" j ON j."id" = je."job_id"
      WHERE je."job_id" = ${jobId}
        AND je."provider" = ${provider}
        AND je."model" = ${model}
        AND je."job_version" = j."version"
      LIMIT 1
    `);
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async searchNearest(input: SearchJobEmbeddingsInput): Promise<JobEmbeddingSearchResult[]> {
    const provider = validateText(input.provider, 'provider');
    const model = validateText(input.model, 'model');
    const vector = validateEmbedding(input.embedding);
    const requestedLimit = input.limit ?? JOB_EMBEDDING_DEFAULT_SEARCH_LIMIT;
    if (
      !Number.isInteger(requestedLimit) ||
      requestedLimit < 1 ||
      requestedLimit > JOB_EMBEDDING_MAX_SEARCH_LIMIT
    ) {
      throw new AppError(
        `limit must be between 1 and ${JOB_EMBEDDING_MAX_SEARCH_LIMIT}`,
        422,
        'INVALID_JOB_EMBEDDING_SEARCH_LIMIT',
      );
    }

    const conditions: Prisma.Sql[] = [
      Prisma.sql`je."provider" = ${provider}`,
      Prisma.sql`je."model" = ${model}`,
      Prisma.sql`je."job_version" = j."version"`,
      Prisma.sql`j."status" = ${JobStatus.ACTIVE}::"JobStatus"`,
    ];
    const filters = input.filters;
    if (filters?.companySlugs?.length) {
      conditions.push(Prisma.sql`j."company_slug" IN (${Prisma.join(filters.companySlugs)})`);
    }
    if (filters?.remoteTypes?.length) {
      conditions.push(Prisma.sql`j."remote_type" IN (${Prisma.join(filters.remoteTypes)})`);
    }
    if (filters?.excludeJobIds?.length) {
      conditions.push(Prisma.sql`j."id" NOT IN (${Prisma.join(filters.excludeJobIds)})`);
    }
    if (filters?.postedAfter) {
      if (Number.isNaN(filters.postedAfter.getTime())) {
        throw new AppError(
          'postedAfter must be a valid date',
          422,
          'INVALID_JOB_EMBEDDING_SEARCH_FILTER',
        );
      }
      conditions.push(Prisma.sql`j."posted_at" >= ${filters.postedAfter}`);
    }
    if (filters?.minSalary !== undefined) {
      if (!Number.isFinite(filters.minSalary) || filters.minSalary < 0) {
        throw new AppError(
          'minSalary must be a non-negative finite number',
          422,
          'INVALID_JOB_EMBEDDING_SEARCH_FILTER',
        );
      }
      conditions.push(Prisma.sql`COALESCE(j."salary_max", j."salary_min") >= ${filters.minSalary}`);
    }

    const rows = await this.sql.query<SearchResultRow>(Prisma.sql`
      SELECT
        je."job_id" AS "jobId",
        1 - (je."embedding" <=> CAST(${vector} AS vector)) AS "similarity"
      FROM "job_embeddings" je
      INNER JOIN "jobs" j ON j."id" = je."job_id"
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY je."embedding" <=> CAST(${vector} AS vector)
      LIMIT ${requestedLimit}
    `);

    return rows.map((row) => ({
      jobId: row.jobId,
      similarity: Number(row.similarity),
    }));
  }

  async deleteForJob(jobIdInput: string): Promise<number> {
    const jobId = validateText(jobIdInput, 'jobId');
    return this.sql.execute(Prisma.sql`
      DELETE FROM "job_embeddings"
      WHERE "job_id" = ${jobId}
    `);
  }
}
