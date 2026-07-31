import type { Prisma } from '@prisma/client';

export interface ClaimedOutboxEvent {
  readonly id: string;
  readonly aggregateId: string;
  readonly eventType: string;
  readonly payload: Prisma.JsonValue;
  readonly attemptCount: number;
  readonly createdAt: Date;
}

export interface ClaimOutboxEventsOptions {
  readonly workerId: string;
  readonly batchSize: number;
  readonly maxAttempts: number;
  readonly lockTimeoutMs: number;
}

export interface OutboxEventRoute {
  readonly exchange: string;
  readonly routingKey: string;
}

export interface OutboxRelaySummary {
  readonly claimed: number;
  readonly published: number;
  readonly retryScheduled: number;
  readonly failed: number;
}
