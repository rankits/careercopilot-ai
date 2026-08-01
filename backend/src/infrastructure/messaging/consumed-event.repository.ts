import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/config/db.conf.js';

export type ConsumedEventClaim = 'ACQUIRED' | 'COMPLETED' | 'BUSY';

export interface ConsumedEventRepository {
  claim(
    eventId: string,
    consumerName: string,
    workerId: string,
    staleAfterMs: number,
  ): Promise<ConsumedEventClaim>;
  complete(eventId: string, consumerName: string, workerId: string): Promise<boolean>;
  release(eventId: string, consumerName: string, workerId: string): Promise<boolean>;
}

export interface ConsumedEventSqlExecutor {
  query<T>(statement: Prisma.Sql): Promise<T[]>;
  execute(statement: Prisma.Sql): Promise<number>;
}

class PrismaConsumedEventSqlExecutor implements ConsumedEventSqlExecutor {
  query<T>(statement: Prisma.Sql): Promise<T[]> {
    return prisma.$queryRaw<T[]>(statement);
  }

  execute(statement: Prisma.Sql): Promise<number> {
    return prisma.$executeRaw(statement);
  }
}

export class PrismaConsumedEventRepository implements ConsumedEventRepository {
  constructor(
    private readonly sql: ConsumedEventSqlExecutor = new PrismaConsumedEventSqlExecutor(),
  ) {}

  async claim(
    eventId: string,
    consumerName: string,
    workerId: string,
    staleAfterMs: number,
  ): Promise<ConsumedEventClaim> {
    const inserted = await this.sql.query<{ eventId: string }>(Prisma.sql`
      INSERT INTO "consumed_events" (
        "event_id",
        "consumer_name",
        "status",
        "locked_by",
        "locked_at",
        "attempt_count",
        "processed_at"
      )
      VALUES (
        ${eventId},
        ${consumerName},
        'PROCESSING',
        ${workerId},
        CURRENT_TIMESTAMP,
        1,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("event_id", "consumer_name") DO NOTHING
      RETURNING "event_id" AS "eventId"
    `);
    if (inserted.length > 0) return 'ACQUIRED';

    const reclaimed = await this.sql.query<{ eventId: string }>(Prisma.sql`
      UPDATE "consumed_events"
      SET
        "locked_by" = ${workerId},
        "locked_at" = CURRENT_TIMESTAMP,
        "attempt_count" = "attempt_count" + 1,
        "processed_at" = CURRENT_TIMESTAMP
      WHERE "event_id" = ${eventId}
        AND "consumer_name" = ${consumerName}
        AND "status" = 'PROCESSING'
        AND (
          "locked_at" IS NULL
          OR "locked_at" < CURRENT_TIMESTAMP - (${staleAfterMs} * INTERVAL '1 millisecond')
        )
      RETURNING "event_id" AS "eventId"
    `);
    if (reclaimed.length > 0) return 'ACQUIRED';

    const existing = await this.sql.query<{ status: string }>(Prisma.sql`
      SELECT "status"
      FROM "consumed_events"
      WHERE "event_id" = ${eventId}
        AND "consumer_name" = ${consumerName}
      LIMIT 1
    `);
    return existing[0]?.status === 'COMPLETED' ? 'COMPLETED' : 'BUSY';
  }

  async complete(eventId: string, consumerName: string, workerId: string): Promise<boolean> {
    const changed = await this.sql.execute(Prisma.sql`
      UPDATE "consumed_events"
      SET
        "status" = 'COMPLETED',
        "locked_by" = NULL,
        "locked_at" = NULL,
        "processed_at" = CURRENT_TIMESTAMP
      WHERE "event_id" = ${eventId}
        AND "consumer_name" = ${consumerName}
        AND "status" = 'PROCESSING'
        AND "locked_by" = ${workerId}
    `);
    return changed === 1;
  }

  async release(eventId: string, consumerName: string, workerId: string): Promise<boolean> {
    const changed = await this.sql.execute(Prisma.sql`
      DELETE FROM "consumed_events"
      WHERE "event_id" = ${eventId}
        AND "consumer_name" = ${consumerName}
        AND "status" = 'PROCESSING'
        AND "locked_by" = ${workerId}
    `);
    return changed === 1;
  }
}
