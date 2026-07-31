import { describe, expect, it } from 'vitest';
import type { Prisma } from '@prisma/client';
import {
  PrismaOutboxRepository,
  type OutboxSqlExecutor,
} from '@/infrastructure/outbox/outbox.repository.js';

class RecordingSqlExecutor implements OutboxSqlExecutor {
  readonly queries: Prisma.Sql[] = [];
  readonly executions: Prisma.Sql[] = [];
  queryResult: unknown[] = [];
  executeResult = 1;

  async query<T>(statement: Prisma.Sql): Promise<T[]> {
    this.queries.push(statement);
    return this.queryResult as T[];
  }

  async execute(statement: Prisma.Sql): Promise<number> {
    this.executions.push(statement);
    return this.executeResult;
  }
}

describe('PrismaOutboxRepository', () => {
  it('claims due and stale events with row locking', async () => {
    const sql = new RecordingSqlExecutor();
    sql.queryResult = [
      {
        id: 'event-id',
        aggregateId: 'job-id',
        eventType: 'jobs.semantic-content.changed.v1',
        payload: { jobId: 'job-id' },
        attemptCount: 2,
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
      },
    ];
    const repository = new PrismaOutboxRepository(sql);

    const claimed = await repository.claimBatch({
      workerId: 'worker-a',
      batchSize: 25,
      maxAttempts: 10,
      lockTimeoutMs: 60_000,
    });

    expect(claimed).toHaveLength(1);
    const statement = sql.queries[0];
    const query = statement.strings.join('');
    expect(query).toContain('FOR UPDATE SKIP LOCKED');
    expect(query).toContain('"next_attempt_at" <= CURRENT_TIMESTAMP');
    expect(query).toContain('"locked_at" < CURRENT_TIMESTAMP');
    expect(statement.values).toEqual(
      expect.arrayContaining(['PENDING', 'PROCESSING', 60_000, 10, 25, 'worker-a']),
    );
  });

  it('guards state transitions with the current lock owner', async () => {
    const sql = new RecordingSqlExecutor();
    const repository = new PrismaOutboxRepository(sql);

    await expect(repository.markPublished('event-id', 'worker-a', new Date())).resolves.toBe(true);
    await expect(
      repository.scheduleRetry(
        'event-id',
        'worker-a',
        new Date('2026-08-01T00:01:00.000Z'),
        'broker unavailable',
      ),
    ).resolves.toBe(true);
    await expect(repository.markFailed('event-id', 'worker-a', 'no route')).resolves.toBe(true);

    for (const statement of sql.executions) {
      const query = statement.strings.join('');
      expect(query).toContain('"status" = ');
      expect(query).toContain('"locked_by" = ');
      expect(statement.values).toContain('event-id');
      expect(statement.values).toContain('worker-a');
    }
  });

  it('returns false when a state transition loses ownership', async () => {
    const sql = new RecordingSqlExecutor();
    sql.executeResult = 0;
    const repository = new PrismaOutboxRepository(sql);

    await expect(repository.markFailed('event-id', 'stale-worker', 'failure')).resolves.toBe(false);
  });
});
