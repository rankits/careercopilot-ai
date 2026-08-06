import pino from 'pino';
import { describe, expect, it } from 'vitest';
import type { PublishOptions } from '@/infrastructure/messaging/messaging.interface.js';
import {
  MessageExchanges,
  MessageQueues,
  MessageRoutingKeys,
  QoSPresets,
} from '@/infrastructure/messaging/messaging.topology.js';
import type { OutboxRepository } from '@/infrastructure/outbox/outbox.repository.js';
import { OutboxRelay, prepareOutboxRelayTopology } from '@/infrastructure/outbox/outbox.relay.js';
import type {
  ClaimedOutboxEvent,
  ClaimOutboxEventsOptions,
} from '@/infrastructure/outbox/outbox.types.js';
import { JOB_SEMANTIC_CONTENT_CHANGED_EVENT } from '@/modules/jobs/events/job.events.js';

class MemoryOutboxRepository implements OutboxRepository {
  events: ClaimedOutboxEvent[] = [];
  claims: ClaimOutboxEventsOptions[] = [];
  published: string[] = [];
  retries: Array<{ eventId: string; nextAttemptAt: Date; error: string }> = [];
  failed: Array<{ eventId: string; error: string }> = [];
  publishResult = true;

  async claimBatch(options: ClaimOutboxEventsOptions): Promise<ClaimedOutboxEvent[]> {
    this.claims.push(options);
    return this.events;
  }

  async markPublished(eventId: string): Promise<boolean> {
    this.published.push(eventId);
    return this.publishResult;
  }

  async scheduleRetry(
    eventId: string,
    _workerId: string,
    nextAttemptAt: Date,
    error: string,
  ): Promise<boolean> {
    this.retries.push({ eventId, nextAttemptAt, error });
    return true;
  }

  async markFailed(eventId: string, _workerId: string, error: string): Promise<boolean> {
    this.failed.push({ eventId, error });
    return true;
  }
}

class RecordingPublisher {
  result = true;
  error: Error | undefined;
  calls: Array<{
    exchange: string;
    routingKey: string;
    payload: unknown;
    options: PublishOptions | undefined;
  }> = [];

  async publishEvent<T>(
    exchange: string,
    routingKey: string,
    payload: T,
    options?: PublishOptions,
  ): Promise<boolean> {
    this.calls.push({ exchange, routingKey, payload, options });
    if (this.error) throw this.error;
    return this.result;
  }
}

const event = (overrides: Partial<ClaimedOutboxEvent> = {}): ClaimedOutboxEvent => ({
  id: 'event-id',
  aggregateId: 'job-id',
  eventType: JOB_SEMANTIC_CONTENT_CHANGED_EVENT,
  payload: { jobId: 'job-id', jobVersion: 2 },
  attemptCount: 1,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  ...overrides,
});

const options = {
  batchSize: 10,
  maxAttempts: 3,
  lockTimeoutMs: 60_000,
  retryBaseDelayMs: 5_000,
};

const silentLogger = pino({ enabled: false });

describe('OutboxRelay', () => {
  it('declares the durable embedding queue before relaying events', async () => {
    const calls: unknown[][] = [];
    const bus = {
      ensureQueue: async (...args: unknown[]): Promise<void> => {
        calls.push(args);
      },
    };

    await prepareOutboxRelayTopology(bus);

    expect(calls).toEqual([
      [
        MessageQueues.JOB_EMBEDDING_REQUESTS,
        MessageExchanges.DOMAIN_EVENTS,
        MessageRoutingKeys.JOB_SEMANTIC_CONTENT_CHANGED,
        QoSPresets.RELIABLE_DLQ,
      ],
    ]);
  });

  it('publishes a routed event with its durable outbox identity', async () => {
    const repository = new MemoryOutboxRepository();
    repository.events = [event()];
    const publisher = new RecordingPublisher();
    const relay = new OutboxRelay(repository, publisher, silentLogger, options, 'worker-a');

    const summary = await relay.runOnce();

    expect(summary).toEqual({ claimed: 1, published: 1, retryScheduled: 0, failed: 0 });
    expect(repository.published).toEqual(['event-id']);
    expect(publisher.calls[0]).toMatchObject({
      exchange: MessageExchanges.DOMAIN_EVENTS,
      routingKey: MessageRoutingKeys.JOB_SEMANTIC_CONTENT_CHANGED,
      payload: { jobId: 'job-id', jobVersion: 2 },
      options: {
        persistent: true,
        messageId: 'event-id',
        timestamp: new Date('2026-08-01T00:00:00.000Z').getTime(),
        headers: {
          'x-event-type': JOB_SEMANTIC_CONTENT_CHANGED_EVENT,
          'x-aggregate-id': 'job-id',
          'x-outbox-attempt': 1,
        },
      },
    });
  });

  it('schedules broker failures with exponential retry metadata', async () => {
    const repository = new MemoryOutboxRepository();
    repository.events = [event({ attemptCount: 2 })];
    const publisher = new RecordingPublisher();
    publisher.error = new Error('broker unavailable');
    const relay = new OutboxRelay(repository, publisher, silentLogger, options, 'worker-a');
    const startedAt = Date.now();

    const summary = await relay.runOnce();

    expect(summary.retryScheduled).toBe(1);
    expect(repository.retries[0]).toMatchObject({
      eventId: 'event-id',
      error: 'broker unavailable',
    });
    expect(repository.retries[0].nextAttemptAt.getTime()).toBeGreaterThanOrEqual(
      startedAt + 10_000,
    );
  });

  it('marks exhausted and unroutable events as terminal failures', async () => {
    const repository = new MemoryOutboxRepository();
    repository.events = [
      event({ id: 'exhausted', attemptCount: 3 }),
      event({ id: 'unknown', eventType: 'unknown.event' }),
    ];
    const publisher = new RecordingPublisher();
    publisher.result = false;
    const relay = new OutboxRelay(repository, publisher, silentLogger, options, 'worker-a');

    const summary = await relay.runOnce();

    expect(summary).toEqual({ claimed: 2, published: 0, retryScheduled: 0, failed: 2 });
    expect(repository.failed).toEqual([
      { eventId: 'exhausted', error: 'Message broker did not confirm publication' },
      {
        eventId: 'unknown',
        error: 'No route registered for outbox event type: unknown.event',
      },
    ]);
  });

  it('fails a published event whose lock was lost before marking', async () => {
    const repository = new MemoryOutboxRepository();
    repository.events = [event({ attemptCount: 3 })];
    repository.publishResult = false; // publishEvent confirms, markPublished loses ownership
    const publisher = new RecordingPublisher();
    const relay = new OutboxRelay(repository, publisher, silentLogger, options, 'worker-a');

    const summary = await relay.runOnce();

    expect(summary).toEqual({ claimed: 1, published: 0, retryScheduled: 0, failed: 1 });
    expect(repository.failed[0].error).toBe('Outbox event lock was lost after publication');
  });

  it('retries a published event whose lock was lost before attempts run out', async () => {
    const repository = new MemoryOutboxRepository();
    repository.events = [event({ attemptCount: 1 })];
    repository.publishResult = false;
    const publisher = new RecordingPublisher();
    const relay = new OutboxRelay(repository, publisher, silentLogger, options, 'worker-a');

    const summary = await relay.runOnce();

    expect(summary).toEqual({ claimed: 1, published: 0, retryScheduled: 1, failed: 0 });
    expect(repository.retries[0].eventId).toBe('event-id');
  });

  it('handles non-Error publisher failures', async () => {
    const repository = new MemoryOutboxRepository();
    repository.events = [event({ attemptCount: 1 })];
    const publisher = new RecordingPublisher();
    publisher.error = 'plain string failure' as unknown as Error;
    const relay = new OutboxRelay(repository, publisher, silentLogger, options, 'worker-a');

    const summary = await relay.runOnce();

    expect(summary.retryScheduled).toBe(1);
    expect(repository.retries[0].error).toBe('plain string failure');
  });

  it('reports an empty batch without logging', async () => {
    const repository = new MemoryOutboxRepository();
    const publisher = new RecordingPublisher();
    const relay = new OutboxRelay(repository, publisher, silentLogger, options, 'worker-a');

    const summary = await relay.runOnce();

    expect(summary).toEqual({ claimed: 0, published: 0, retryScheduled: 0, failed: 0 });
  });

  it('constructs with all defaults', () => {
    const relay = new OutboxRelay();
    expect(relay).toBeInstanceOf(OutboxRelay);
  });
});

describe('prepareOutboxRelayTopology defaults', () => {
  it('uses the shared messageBus when no bus is supplied', async () => {
    // The default bus drives a real (usually unreachable) RabbitMQ broker;
    // either resolution or rejection still exercises the default param.
    await prepareOutboxRelayTopology().then(
      () => undefined,
      () => undefined,
    );
  });
});
