import { describe, expect, it } from 'vitest';
import type { Prisma } from '@prisma/client';
import { JOB_EMBEDDING_DIMENSIONS } from '@/modules/job-embeddings/constants/job-embedding.constants.js';
import {
  PrismaCandidateEmbeddingRepository,
  type CandidateEmbeddingSqlExecutor,
} from '@/modules/recommendations/repositories/prisma-candidate-embedding.repository.js';

class RecordingSqlExecutor implements CandidateEmbeddingSqlExecutor {
  readonly queryStatements: Prisma.Sql[] = [];
  readonly executeStatements: Prisma.Sql[] = [];
  queryResults: unknown[][] = [];
  executeResult = 0;

  async query<T>(statement: Prisma.Sql): Promise<T[]> {
    this.queryStatements.push(statement);
    return (this.queryResults.shift() ?? []) as T[];
  }

  async execute(statement: Prisma.Sql): Promise<number> {
    this.executeStatements.push(statement);
    return this.executeResult;
  }
}

const embedding = (): number[] =>
  Array.from({ length: JOB_EMBEDDING_DIMENSIONS }, (_, index) => index / 10_000);

const row = {
  id: 'candidate-embedding-id',
  userId: 'user-1',
  sourceType: 'PROFILE',
  sourceId: null,
  sourceKey: 'PROFILE',
  provider: 'google',
  model: 'text-embedding-004',
  dimensions: JOB_EMBEDDING_DIMENSIONS,
  contentHash: 'a'.repeat(64),
  embedding: `[${embedding().join(',')}]`,
  createdAt: new Date('2026-08-02T00:00:00.000Z'),
  updatedAt: new Date('2026-08-02T00:00:00.000Z'),
};

describe('PrismaCandidateEmbeddingRepository', () => {
  it('upserts a user-scoped vector with bound SQL parameters', async () => {
    const sql = new RecordingSqlExecutor();
    sql.queryResults.push([row]);
    const repository = new PrismaCandidateEmbeddingRepository(sql);

    const result = await repository.upsert({
      userId: "user-1'; DROP TABLE users; --",
      sourceType: 'PROFILE',
      provider: 'google',
      model: 'text-embedding-004',
      contentHash: 'A'.repeat(64),
      embedding: embedding(),
    });

    expect(result.embedding).toEqual(embedding());
    const statement = sql.queryStatements[0];
    expect(statement.strings.join('')).not.toContain('DROP TABLE');
    expect(statement.values).toContain("user-1'; DROP TABLE users; --");
    expect(statement.values).toContain('a'.repeat(64));
  });

  it('finds only fresh rows with matching content hash and dimensions', async () => {
    const sql = new RecordingSqlExecutor();
    sql.queryResults.push([row]);
    const repository = new PrismaCandidateEmbeddingRepository(sql);

    const result = await repository.findFresh({
      userId: 'user-1',
      sourceType: 'PROFILE',
      provider: 'google',
      model: 'text-embedding-004',
      contentHash: 'a'.repeat(64),
    });

    expect(result?.embedding).toEqual(embedding());
    const queryText = sql.queryStatements[0].strings.join('');
    expect(queryText).toContain('"content_hash" = ');
    expect(queryText).toContain('"dimensions" = ');
    expect(sql.queryStatements[0].values).toContain(JOB_EMBEDDING_DIMENSIONS);
  });

  it('finds reusable rows by user provider model and content hash across sources', async () => {
    const sql = new RecordingSqlExecutor();
    sql.queryResults.push([row]);
    const repository = new PrismaCandidateEmbeddingRepository(sql);

    await expect(
      repository.findReusable({
        userId: 'user-1',
        provider: 'google',
        model: 'text-embedding-004',
        contentHash: 'a'.repeat(64),
      }),
    ).resolves.toMatchObject({ id: 'candidate-embedding-id' });

    const queryText = sql.queryStatements[0].strings.join('');
    expect(queryText).toContain('ORDER BY "updated_at" DESC');
    expect(queryText).not.toContain('"source_type" = ');
  });

  it('rejects wrong-dimension vectors before querying', async () => {
    const sql = new RecordingSqlExecutor();
    const repository = new PrismaCandidateEmbeddingRepository(sql);

    await expect(
      repository.upsert({
        userId: 'user-1',
        sourceType: 'PROFILE',
        provider: 'google',
        model: 'text-embedding-004',
        contentHash: 'a'.repeat(64),
        embedding: [0.1, 0.2],
      }),
    ).rejects.toMatchObject({
      statusCode: 422,
      code: 'INVALID_CANDIDATE_EMBEDDING_DIMENSIONS',
    });
    expect(sql.queryStatements).toHaveLength(0);
  });

  it('deletes rows by user and optional source scope', async () => {
    const sql = new RecordingSqlExecutor();
    sql.executeResult = 2;
    const repository = new PrismaCandidateEmbeddingRepository(sql);

    await expect(
      repository.deleteForUserSource({
        userId: 'user-1',
        sourceType: 'RESUME',
        sourceId: 'resume-1',
      }),
    ).resolves.toBe(2);

    expect(sql.executeStatements[0].values).toContain('user-1');
    expect(sql.executeStatements[0].values).toContain('RESUME');
    expect(sql.executeStatements[0].values).toContain('resume-1');
  });
});
