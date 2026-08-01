import { describe, expect, it } from 'vitest';
import type { Prisma } from '@prisma/client';
import { JOB_EMBEDDING_DIMENSIONS } from '@/modules/job-embeddings/constants/job-embedding.constants.js';
import {
  PrismaJobEmbeddingRepository,
  type JobEmbeddingSqlExecutor,
} from '@/modules/job-embeddings/repositories/prisma-job-embedding.repository.js';

class RecordingSqlExecutor implements JobEmbeddingSqlExecutor {
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
  id: 'embedding-id',
  jobId: 'job-id',
  provider: 'google',
  model: 'gemini-embedding-2',
  dimensions: JOB_EMBEDDING_DIMENSIONS,
  contentHash: 'a'.repeat(64),
  jobVersion: 2,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
};

describe('PrismaJobEmbeddingRepository', () => {
  it('upserts a validated vector through bound SQL parameters', async () => {
    const sql = new RecordingSqlExecutor();
    sql.queryResults.push([row]);
    const repository = new PrismaJobEmbeddingRepository(sql);

    const result = await repository.upsert({
      jobId: "job-id'; DROP TABLE jobs; --",
      provider: 'google',
      model: 'gemini-embedding-2',
      contentHash: 'A'.repeat(64),
      jobVersion: 2,
      embedding: embedding(),
    });

    expect(result).toEqual(row);
    const statement = sql.queryStatements[0];
    expect(statement.strings.join('')).not.toContain('DROP TABLE');
    expect(statement.values).toContain("job-id'; DROP TABLE jobs; --");
    expect(statement.values).toContain('a'.repeat(64));
  });

  it('rejects vectors with the wrong dimensions before querying', async () => {
    const sql = new RecordingSqlExecutor();
    const repository = new PrismaJobEmbeddingRepository(sql);

    await expect(
      repository.upsert({
        jobId: 'job-id',
        provider: 'google',
        model: 'gemini-embedding-2',
        contentHash: 'a'.repeat(64),
        jobVersion: 1,
        embedding: [0.1, 0.2],
      }),
    ).rejects.toMatchObject({
      statusCode: 422,
      code: 'INVALID_JOB_EMBEDDING_DIMENSIONS',
    });
    expect(sql.queryStatements).toHaveLength(0);
  });

  it('searches only current active job vectors and parameterizes filters', async () => {
    const sql = new RecordingSqlExecutor();
    sql.queryResults.push([{ jobId: 'job-id', similarity: '0.875' }]);
    const repository = new PrismaJobEmbeddingRepository(sql);

    const result = await repository.searchNearest({
      provider: 'google',
      model: 'gemini-embedding-2',
      embedding: embedding(),
      limit: 25,
      filters: {
        companySlugs: ["acme'; DELETE FROM jobs; --"],
        remoteTypes: ['REMOTE'],
        excludeJobIds: ['excluded-job'],
        postedAfter: new Date('2026-01-01T00:00:00.000Z'),
        minSalary: 80_000,
        maxSalary: 160_000,
        currency: 'usd',
      },
    });

    expect(result).toEqual([{ jobId: 'job-id', similarity: 0.875 }]);
    const statement = sql.queryStatements[0];
    const queryText = statement.strings.join('');
    expect(queryText).toContain('je."job_version" = j."version"');
    expect(queryText).toContain('j."status" = ');
    expect(queryText).toContain('salary_min');
    expect(queryText).toContain('UPPER(j."currency")');
    expect(queryText).not.toContain('DELETE FROM jobs');
    expect(statement.values).toContain("acme'; DELETE FROM jobs; --");
    expect(statement.values).toContain(25);
    expect(statement.values).toContain(160_000);
    expect(statement.values).toContain('USD');
  });

  it('deletes embeddings for a job through a bound parameter', async () => {
    const sql = new RecordingSqlExecutor();
    sql.executeResult = 2;
    const repository = new PrismaJobEmbeddingRepository(sql);

    await expect(repository.deleteForJob('job-id')).resolves.toBe(2);
    expect(sql.executeStatements[0].values).toContain('job-id');
  });
});
