import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { JOB_EMBEDDING_DIMENSIONS } from '@/modules/job-embeddings/constants/job-embedding.constants.js';
import type { CandidateEmbeddingRepository } from '@/modules/recommendations/contracts/candidate-embedding.repository.js';
import type {
  CandidateEmbeddingIdentity,
  CandidateEmbeddingRecord,
  FindFreshCandidateEmbeddingInput,
  FindReusableCandidateEmbeddingInput,
  UpsertCandidateEmbeddingInput,
} from '@/modules/recommendations/types/candidate-embedding.types.js';
import { prisma } from '@/shared/config/db.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

interface CandidateEmbeddingRow {
  id: string;
  userId: string;
  sourceType: CandidateEmbeddingRecord['sourceType'];
  sourceId: string | null;
  sourceKey: string;
  provider: string;
  model: string;
  dimensions: number;
  contentHash: string;
  embedding: string | number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CandidateEmbeddingSqlExecutor {
  query<T>(statement: Prisma.Sql): Promise<T[]>;
  execute(statement: Prisma.Sql): Promise<number>;
}

class PrismaCandidateEmbeddingSqlExecutor implements CandidateEmbeddingSqlExecutor {
  query<T>(statement: Prisma.Sql): Promise<T[]> {
    return prisma.$queryRaw<T[]>(statement);
  }

  execute(statement: Prisma.Sql): Promise<number> {
    return prisma.$executeRaw(statement);
  }
}

export const candidateEmbeddingSourceKey = (
  sourceType: CandidateEmbeddingIdentity['sourceType'],
  sourceId?: string | null,
): string => sourceId?.trim() || sourceType;

const validateText = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new AppError(`${field} is required`, 422, 'INVALID_CANDIDATE_EMBEDDING_INPUT');
  }
  return normalized;
};

const validateContentHash = (contentHash: string): string => {
  const normalized = contentHash.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new AppError(
      'contentHash must be a SHA-256 hexadecimal digest',
      422,
      'INVALID_CANDIDATE_EMBEDDING_CONTENT_HASH',
    );
  }
  return normalized;
};

const validateEmbedding = (embedding: readonly number[]): string => {
  if (embedding.length !== JOB_EMBEDDING_DIMENSIONS) {
    throw new AppError(
      `Embedding must contain ${JOB_EMBEDDING_DIMENSIONS} dimensions`,
      422,
      'INVALID_CANDIDATE_EMBEDDING_DIMENSIONS',
    );
  }
  if (embedding.some((value) => !Number.isFinite(value))) {
    throw new AppError(
      'Embedding contains a non-finite value',
      422,
      'INVALID_CANDIDATE_EMBEDDING_VALUE',
    );
  }
  return `[${embedding.join(',')}]`;
};

const parseVector = (value: string | number[]): number[] => {
  if (Array.isArray(value)) return value;
  return value
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(',')
    .filter(Boolean)
    .map(Number);
};

const toRecord = (row: CandidateEmbeddingRow): CandidateEmbeddingRecord => ({
  ...row,
  embedding: parseVector(row.embedding),
});

export class PrismaCandidateEmbeddingRepository implements CandidateEmbeddingRepository {
  constructor(
    private readonly sql: CandidateEmbeddingSqlExecutor = new PrismaCandidateEmbeddingSqlExecutor(),
  ) {}

  async findFresh(input: FindFreshCandidateEmbeddingInput): Promise<CandidateEmbeddingRecord | null> {
    const identity = this.validateIdentity(input);
    const contentHash = validateContentHash(input.contentHash);
    const rows = await this.sql.query<CandidateEmbeddingRow>(Prisma.sql`
      SELECT
        "id",
        "user_id" AS "userId",
        "source_type" AS "sourceType",
        "source_id" AS "sourceId",
        "source_key" AS "sourceKey",
        "provider",
        "model",
        "dimensions",
        "content_hash" AS "contentHash",
        "embedding"::text AS "embedding",
        "created_at" AS "createdAt",
        "updated_at" AS "updatedAt"
      FROM "candidate_embeddings"
      WHERE "user_id" = ${identity.userId}
        AND "source_type" = ${identity.sourceType}::"RecommendationSourceType"
        AND "source_key" = ${identity.sourceKey}
        AND "provider" = ${identity.provider}
        AND "model" = ${identity.model}
        AND "content_hash" = ${contentHash}
        AND "dimensions" = ${JOB_EMBEDDING_DIMENSIONS}
      LIMIT 1
    `);
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async findReusable(
    input: FindReusableCandidateEmbeddingInput,
  ): Promise<CandidateEmbeddingRecord | null> {
    const userId = validateText(input.userId, 'userId');
    const provider = validateText(input.provider, 'provider');
    const model = validateText(input.model, 'model');
    const contentHash = validateContentHash(input.contentHash);
    const rows = await this.sql.query<CandidateEmbeddingRow>(Prisma.sql`
      SELECT
        "id",
        "user_id" AS "userId",
        "source_type" AS "sourceType",
        "source_id" AS "sourceId",
        "source_key" AS "sourceKey",
        "provider",
        "model",
        "dimensions",
        "content_hash" AS "contentHash",
        "embedding"::text AS "embedding",
        "created_at" AS "createdAt",
        "updated_at" AS "updatedAt"
      FROM "candidate_embeddings"
      WHERE "user_id" = ${userId}
        AND "provider" = ${provider}
        AND "model" = ${model}
        AND "content_hash" = ${contentHash}
        AND "dimensions" = ${JOB_EMBEDDING_DIMENSIONS}
      ORDER BY "updated_at" DESC, "id" ASC
      LIMIT 1
    `);
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async upsert(input: UpsertCandidateEmbeddingInput): Promise<CandidateEmbeddingRecord> {
    const identity = this.validateIdentity(input);
    const contentHash = validateContentHash(input.contentHash);
    const vector = validateEmbedding(input.embedding);
    const rows = await this.sql.query<CandidateEmbeddingRow>(Prisma.sql`
      INSERT INTO "candidate_embeddings" (
        "id",
        "user_id",
        "source_type",
        "source_id",
        "source_key",
        "provider",
        "model",
        "dimensions",
        "content_hash",
        "embedding",
        "created_at",
        "updated_at"
      )
      VALUES (
        ${randomUUID()},
        ${identity.userId},
        ${identity.sourceType}::"RecommendationSourceType",
        ${identity.sourceId},
        ${identity.sourceKey},
        ${identity.provider},
        ${identity.model},
        ${JOB_EMBEDDING_DIMENSIONS},
        ${contentHash},
        CAST(${vector} AS vector),
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("user_id", "source_type", "source_key", "provider", "model")
      DO UPDATE SET
        "source_id" = EXCLUDED."source_id",
        "dimensions" = EXCLUDED."dimensions",
        "content_hash" = EXCLUDED."content_hash",
        "embedding" = EXCLUDED."embedding",
        "updated_at" = CURRENT_TIMESTAMP
      RETURNING
        "id",
        "user_id" AS "userId",
        "source_type" AS "sourceType",
        "source_id" AS "sourceId",
        "source_key" AS "sourceKey",
        "provider",
        "model",
        "dimensions",
        "content_hash" AS "contentHash",
        "embedding"::text AS "embedding",
        "created_at" AS "createdAt",
        "updated_at" AS "updatedAt"
    `);
    const row = rows[0];
    if (!row) {
      throw new AppError(
        'Candidate embedding could not be persisted',
        500,
        'CANDIDATE_EMBEDDING_PERSISTENCE_FAILED',
      );
    }
    return toRecord(row);
  }

  async deleteForUserSource(input: {
    userId: string;
    sourceType?: CandidateEmbeddingIdentity['sourceType'];
    sourceId?: string | null;
  }): Promise<number> {
    const userId = validateText(input.userId, 'userId');
    const conditions: Prisma.Sql[] = [Prisma.sql`"user_id" = ${userId}`];
    if (input.sourceType) {
      conditions.push(Prisma.sql`"source_type" = ${input.sourceType}::"RecommendationSourceType"`);
    }
    if (input.sourceId !== undefined) {
      if (!input.sourceType) {
        throw new AppError(
          'sourceType is required when sourceId is provided',
          422,
          'INVALID_CANDIDATE_EMBEDDING_INPUT',
        );
      }
      conditions.push(
        Prisma.sql`"source_key" = ${candidateEmbeddingSourceKey(
          input.sourceType,
          input.sourceId,
        )}`,
      );
    }
    return this.sql.execute(Prisma.sql`
      DELETE FROM "candidate_embeddings"
      WHERE ${Prisma.join(conditions, ' AND ')}
    `);
  }

  private validateIdentity(input: CandidateEmbeddingIdentity): CandidateEmbeddingIdentity & {
    sourceKey: string;
  } {
    const userId = validateText(input.userId, 'userId');
    const provider = validateText(input.provider, 'provider');
    const model = validateText(input.model, 'model');
    return {
      userId,
      provider,
      model,
      sourceType: input.sourceType,
      sourceId: input.sourceId?.trim() || null,
      sourceKey: candidateEmbeddingSourceKey(input.sourceType, input.sourceId),
    };
  }
}
