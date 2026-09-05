import { randomUUID } from 'node:crypto';
import type { Logger } from 'pino';
import type { IMessageBus } from '@/infrastructure/messaging/messaging.interface.js';
import {
  MessageExchanges,
  MessageQueues,
  MessageRoutingKeys,
  QoSPresets,
} from '@/infrastructure/messaging/messaging.topology.js';
import { messageBus } from '@/infrastructure/messaging/messaging.service.js';
import { outboxConfig } from '@/infrastructure/outbox/outbox.config.js';
import {
  PrismaOutboxRepository,
  type OutboxRepository,
} from '@/infrastructure/outbox/outbox.repository.js';
import type {
  ClaimedOutboxEvent,
  OutboxEventRoute,
  OutboxRelaySummary,
} from '@/infrastructure/outbox/outbox.types.js';
import { JOB_SEMANTIC_CONTENT_CHANGED_EVENT } from '@/modules/jobs/events/job.events.js';
import { RESUME_ANALYSIS_REQUESTED_EVENT } from '@/modules/resume-analysis/events/resume-analysis.events.js';
import { logger } from '@/shared/logger/logger.js';

export interface OutboxRelayOptions {
  readonly batchSize: number;
  readonly maxAttempts: number;
  readonly lockTimeoutMs: number;
  readonly retryBaseDelayMs: number;
}

const defaultOptions: OutboxRelayOptions = {
  batchSize: outboxConfig.batchSize,
  maxAttempts: outboxConfig.maxAttempts,
  lockTimeoutMs: outboxConfig.lockTimeoutMs,
  retryBaseDelayMs: outboxConfig.retryBaseDelayMs,
};

export const resolveOutboxEventRoute = (eventType: string): OutboxEventRoute | null => {
  if (eventType === JOB_SEMANTIC_CONTENT_CHANGED_EVENT) {
    return {
      exchange: MessageExchanges.DOMAIN_EVENTS,
      routingKey: MessageRoutingKeys.JOB_SEMANTIC_CONTENT_CHANGED,
    };
  }
  if (eventType === RESUME_ANALYSIS_REQUESTED_EVENT) {
    return {
      exchange: MessageExchanges.DOMAIN_EVENTS,
      routingKey: MessageRoutingKeys.RESUME_ANALYSIS_REQUESTED,
    };
  }
  return null;
};

export const prepareOutboxRelayTopology = async (
  bus: Pick<IMessageBus, 'ensureQueue'> = messageBus,
): Promise<void> => {
  await bus.ensureQueue(
    MessageQueues.JOB_EMBEDDING_REQUESTS,
    MessageExchanges.DOMAIN_EVENTS,
    MessageRoutingKeys.JOB_SEMANTIC_CONTENT_CHANGED,
    QoSPresets.RELIABLE_DLQ,
  );
  await bus.ensureQueue(
    MessageQueues.RESUME_ANALYSIS_REQUESTS,
    MessageExchanges.DOMAIN_EVENTS,
    MessageRoutingKeys.RESUME_ANALYSIS_REQUESTED,
    QoSPresets.RELIABLE_DLQ,
  );
};

const errorMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 2_000);
};

export class OutboxRelay {
  constructor(
    private readonly repository: OutboxRepository = new PrismaOutboxRepository(),
    private readonly publisher: Pick<IMessageBus, 'publishEvent'> = messageBus,
    private readonly relayLogger: Logger = logger,
    private readonly options: OutboxRelayOptions = defaultOptions,
    private readonly workerId = `outbox-${process.pid}-${randomUUID()}`,
  ) {}

  async runOnce(): Promise<OutboxRelaySummary> {
    const events = await this.repository.claimBatch({
      workerId: this.workerId,
      batchSize: this.options.batchSize,
      maxAttempts: this.options.maxAttempts,
      lockTimeoutMs: this.options.lockTimeoutMs,
    });
    const summary = {
      claimed: events.length,
      published: 0,
      retryScheduled: 0,
      failed: 0,
    };

    for (const event of events) {
      const result = await this.publish(event);
      if (result === 'PUBLISHED') summary.published++;
      else if (result === 'RETRY_SCHEDULED') summary.retryScheduled++;
      else summary.failed++;
    }

    if (events.length > 0) {
      this.relayLogger.info(
        { workerId: this.workerId, ...summary },
        'Outbox relay batch completed',
      );
    }
    return summary;
  }

  private async publish(
    event: ClaimedOutboxEvent,
  ): Promise<'PUBLISHED' | 'RETRY_SCHEDULED' | 'FAILED'> {
    const route = resolveOutboxEventRoute(event.eventType);
    if (!route) {
      await this.repository.markFailed(
        event.id,
        this.workerId,
        `No route registered for outbox event type: ${event.eventType}`,
      );
      this.relayLogger.error(
        { eventId: event.id, eventType: event.eventType },
        'Outbox event has no publish route',
      );
      return 'FAILED';
    }

    try {
      const confirmed = await this.publisher.publishEvent(
        route.exchange,
        route.routingKey,
        event.payload,
        {
          persistent: true,
          messageId: event.id,
          timestamp: event.createdAt.getTime(),
          headers: {
            'x-event-type': event.eventType,
            'x-aggregate-id': event.aggregateId,
            'x-outbox-attempt': event.attemptCount,
          },
        },
      );
      if (!confirmed) throw new Error('Message broker did not confirm publication');

      const updated = await this.repository.markPublished(event.id, this.workerId, new Date());
      if (!updated) {
        throw new Error('Outbox event lock was lost after publication');
      }
      return 'PUBLISHED';
    } catch (error) {
      const message = errorMessage(error);
      if (event.attemptCount >= this.options.maxAttempts) {
        await this.repository.markFailed(event.id, this.workerId, message);
        this.relayLogger.error(
          { eventId: event.id, eventType: event.eventType, attempt: event.attemptCount, error },
          'Outbox event exhausted publish attempts',
        );
        return 'FAILED';
      }

      const exponent = Math.max(0, event.attemptCount - 1);
      const retryDelayMs = Math.min(this.options.retryBaseDelayMs * 2 ** exponent, 15 * 60_000);
      await this.repository.scheduleRetry(
        event.id,
        this.workerId,
        new Date(Date.now() + retryDelayMs),
        message,
      );
      this.relayLogger.warn(
        {
          eventId: event.id,
          eventType: event.eventType,
          attempt: event.attemptCount,
          retryDelayMs,
          error,
        },
        'Outbox event publication will retry',
      );
      return 'RETRY_SCHEDULED';
    }
  }
}
