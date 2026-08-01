import { describe, expect, it } from 'vitest';
import type { Prisma } from '@prisma/client';
import {
  PrismaJobEmbeddingBackfillRepository,
  type JobEmbeddingBackfillSqlExecutor,
} from '@/modules/job-embeddings/repositories/prisma-job-embedding-backfill.repository.js';
import { JOB_SEMANTIC_CONTENT_CHANGED_EVENT } from '@/modules/jobs/events/job.events.js';

class RecordingSqlExecutor implements JobEmbeddingBackfillSqlExecutor {
  queries: Prisma.Sql[] = [];
  executions: Prisma.Sql[] = [];
  queryResult: unknown[] = [];

  async query<T>(statement: Prisma.Sql): Promise<T[]> {
    this.queries.push(statement);
    return this.queryResult as T[];
  }

  async execute(statement: Prisma.Sql): Promise<number> {
    this.executions.push(statement);
    return 1;
  }
}

describe('PrismaJobEmbeddingBackfillRepository', () => {
  it('scans active jobs with provider-scoped embedding join and cursor', async () => {
    const sql = new RecordingSqlExecutor();
    sql.queryResult = [
      {
        jobId: 'job-1',
        jobVersion: 3,
        companySlug: 'acme',
        companyName: 'Acme Corp',
        title: 'Engineer',
        descriptionText: 'Build things',
        remoteType: 'REMOTE',
        employmentType: null,
        skills: ['Go'],
        tags: ['Platform'],
        providerMetadata: { semanticCompanyName: 'Acme' },
        currentContentHash: null,
        currentJobVersion: null,
        currentDimensions: null,
      },
    ];
    const repository = new PrismaJobEmbeddingBackfillRepository(sql);

    const batch = await repository.scanActiveJobs({
      provider: 'groq',
      model: 'nomic-embed-text-v1_5',
      batchSize: 50,
      afterJobId: 'job-0',
    });

    expect(batch.candidates[0]).toMatchObject({
      jobId: 'job-1',
      companyName: 'Acme',
      jobVersion: 3,
    });
    expect(batch.nextCursorJobId).toBe('job-1');
    const query = sql.queries[0].strings.join('');
    expect(query).toContain('LEFT JOIN "job_embeddings"');
    expect(query).toContain('j."id" > ');
    expect(sql.queries[0].values).toEqual(
      expect.arrayContaining(['groq', 'nomic-embed-text-v1_5', 'job-0', 50]),
    );
  });

  it('enqueues a parameterized outbox event for backfill', async () => {
    const sql = new RecordingSqlExecutor();
    const repository = new PrismaJobEmbeddingBackfillRepository(sql);

    await repository.enqueueSemanticChange({
      jobId: 'job-1',
      jobVersion: 2,
      outcome: 'INSERTED',
      occurredAt: '2026-08-01T00:00:00.000Z',
    });

    const statement = sql.executions[0];
    expect(statement.strings.join('')).toContain('INSERT INTO "outbox_events"');
    expect(statement.values).toEqual(
      expect.arrayContaining([
        'job-1',
        JOB_SEMANTIC_CONTENT_CHANGED_EVENT,
        JSON.stringify({
          jobId: 'job-1',
          jobVersion: 2,
          outcome: 'INSERTED',
          occurredAt: '2026-08-01T00:00:00.000Z',
        }),
      ]),
    );
  });
});
