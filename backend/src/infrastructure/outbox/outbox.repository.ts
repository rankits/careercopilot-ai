import { EventStatus, Prisma } from '@prisma/client';
import type {
  ClaimedOutboxEvent,
  ClaimOutboxEventsOptions,
} from '@/infrastructure/outbox/outbox.types.js';
import { prisma } from '@/shared/config/db.conf.js';

export interface OutboxRepository {
  claimBatch(options: ClaimOutboxEventsOptions): Promise<ClaimedOutboxEvent[]>;
  markPublished(eventId: string, workerId: string, publishedAt: Date): Promise<boolean>;
  scheduleRetry(
    eventId: string,
    workerId: string,
    nextAttemptAt: Date,
    errorMessage: string,
  ): Promise<boolean>;
  markFailed(eventId: string, workerId: string, errorMessage: string): Promise<boolean>;
}

export interface OutboxSqlExecutor {
  query<T>(statement: Prisma.Sql): Promise<T[]>;
  execute(statement: Prisma.Sql): Promise<number>;
}

class PrismaOutboxSqlExecutor implements OutboxSqlExecutor {
  query<T>(statement: Prisma.Sql): Promise<T[]> {
    return prisma.$queryRaw<T[]>(statement);
  }

  execute(statement: Prisma.Sql): Promise<number> {
    return prisma.$executeRaw(statement);
  }
}

interface ClaimedOutboxEventRow {
  id: string;
  aggregateId: string;
  eventType: string;
  payload: Prisma.JsonValue;
  attemptCount: number;
  createdAt: Date;
}

const validatePositiveInteger = (value: number, field: string): void => {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${field} must be a positive integer`);
  }
};

export class PrismaOutboxRepository implements OutboxRepository {
  constructor(private readonly sql: OutboxSqlExecutor = new PrismaOutboxSqlExecutor()) {}

  async claimBatch(options: ClaimOutboxEventsOptions): Promise<ClaimedOutboxEvent[]> {
    validatePositiveInteger(options.batchSize, 'batchSize');
    validatePositiveInteger(options.maxAttempts, 'maxAttempts');
    validatePositiveInteger(options.lockTimeoutMs, 'lockTimeoutMs');
    if (!options.workerId.trim()) throw new Error('workerId is required');

    return this.sql.query<ClaimedOutboxEventRow>(Prisma.sql`
      WITH claimable AS (
        SELECT "id"
        FROM "outbox_events"
        WHERE (
          (
            "status" = ${EventStatus.PENDING}::"EventStatus"
            AND "next_attempt_at" <= CURRENT_TIMESTAMP
            AND "attempt_count" < ${options.maxAttempts}
          )
          OR (
            "status" = ${EventStatus.PROCESSING}::"EventStatus"
            AND "locked_at" < CURRENT_TIMESTAMP - (${options.lockTimeoutMs} * INTERVAL '1 millisecond')
            AND "attempt_count" <= ${options.maxAttempts}
          )
        )
        ORDER BY "created_at" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT ${options.batchSize}
      )
      UPDATE "outbox_events" AS event
      SET
        "status" = ${EventStatus.PROCESSING}::"EventStatus",
        "locked_by" = ${options.workerId},
        "locked_at" = CURRENT_TIMESTAMP,
        "attempt_count" = event."attempt_count" + 1,
        "last_error" = NULL
      FROM claimable
      WHERE event."id" = claimable."id"
      RETURNING
        event."id",
        event."aggregate_id" AS "aggregateId",
        event."event_type" AS "eventType",
        event."payload",
        event."attempt_count" AS "attemptCount",
        event."created_at" AS "createdAt"
    `);
  }

  async markPublished(eventId: string, workerId: string, publishedAt: Date): Promise<boolean> {
    const changed = await this.sql.execute(Prisma.sql`
      UPDATE "outbox_events"
      SET
        "status" = ${EventStatus.PUBLISHED}::"EventStatus",
        "published_at" = ${publishedAt},
        "locked_by" = NULL,
        "locked_at" = NULL,
        "last_error" = NULL
      WHERE "id" = ${eventId}
        AND "status" = ${EventStatus.PROCESSING}::"EventStatus"
        AND "locked_by" = ${workerId}
    `);
    return changed === 1;
  }

  async scheduleRetry(
    eventId: string,
    workerId: string,
    nextAttemptAt: Date,
    errorMessage: string,
  ): Promise<boolean> {
    const changed = await this.sql.execute(Prisma.sql`
      UPDATE "outbox_events"
      SET
        "status" = ${EventStatus.PENDING}::"EventStatus",
        "next_attempt_at" = ${nextAttemptAt},
        "locked_by" = NULL,
        "locked_at" = NULL,
        "last_error" = ${errorMessage}
      WHERE "id" = ${eventId}
        AND "status" = ${EventStatus.PROCESSING}::"EventStatus"
        AND "locked_by" = ${workerId}
    `);
    return changed === 1;
  }

  async markFailed(eventId: string, workerId: string, errorMessage: string): Promise<boolean> {
    const changed = await this.sql.execute(Prisma.sql`
      UPDATE "outbox_events"
      SET
        "status" = ${EventStatus.FAILED}::"EventStatus",
        "locked_by" = NULL,
        "locked_at" = NULL,
        "last_error" = ${errorMessage}
      WHERE "id" = ${eventId}
        AND "status" = ${EventStatus.PROCESSING}::"EventStatus"
        AND "locked_by" = ${workerId}
    `);
    return changed === 1;
  }
}
