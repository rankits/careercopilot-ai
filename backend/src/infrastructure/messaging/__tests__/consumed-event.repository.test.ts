import { describe, expect, it } from 'vitest';
import type { Prisma } from '@prisma/client';
import {
  PrismaConsumedEventRepository,
  type ConsumedEventSqlExecutor,
} from '@/infrastructure/messaging/consumed-event.repository.js';

class RecordingExecutor implements ConsumedEventSqlExecutor {
  queries: Prisma.Sql[] = [];
  executions: Prisma.Sql[] = [];
  queryResults: unknown[][] = [];
  executeResult = 1;

  async query<T>(statement: Prisma.Sql): Promise<T[]> {
    this.queries.push(statement);
    return (this.queryResults.shift() ?? []) as T[];
  }

  async execute(statement: Prisma.Sql): Promise<number> {
    this.executions.push(statement);
    return this.executeResult;
  }
}

describe('PrismaConsumedEventRepository', () => {
  it('acquires a new event idempotency claim', async () => {
    const sql = new RecordingExecutor();
    sql.queryResults.push([{ eventId: 'event-id' }]);
    const repository = new PrismaConsumedEventRepository(sql);

    await expect(repository.claim('event-id', 'consumer', 'worker-a', 30_000)).resolves.toBe(
      'ACQUIRED',
    );
    expect(sql.queries[0].strings.join('')).toContain('ON CONFLICT');
    expect(sql.queries[0].values).toEqual(
      expect.arrayContaining(['event-id', 'consumer', 'worker-a']),
    );
  });

  it('distinguishes completed and actively processing events', async () => {
    const completedSql = new RecordingExecutor();
    completedSql.queryResults.push([], [], [{ status: 'COMPLETED' }]);
    const completed = new PrismaConsumedEventRepository(completedSql);
    await expect(completed.claim('event-id', 'consumer', 'worker-a', 30_000)).resolves.toBe(
      'COMPLETED',
    );

    const busySql = new RecordingExecutor();
    busySql.queryResults.push([], [], [{ status: 'PROCESSING' }]);
    const busy = new PrismaConsumedEventRepository(busySql);
    await expect(busy.claim('event-id', 'consumer', 'worker-b', 30_000)).resolves.toBe('BUSY');
  });

  it('guards completion and release by worker ownership', async () => {
    const sql = new RecordingExecutor();
    const repository = new PrismaConsumedEventRepository(sql);

    await expect(repository.complete('event-id', 'consumer', 'worker-a')).resolves.toBe(true);
    await expect(repository.release('event-id', 'consumer', 'worker-a')).resolves.toBe(true);

    for (const statement of sql.executions) {
      expect(statement.strings.join('')).toContain('"locked_by" = ');
      expect(statement.values).toEqual(
        expect.arrayContaining(['event-id', 'consumer', 'worker-a']),
      );
    }
  });
});
