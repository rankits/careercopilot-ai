import { beforeEach, describe, expect, it, vi } from 'vitest';

const { info, error, FakeOutboxRelay, logger } = vi.hoisted(() => {
  const info = vi.fn();
  const error = vi.fn();
  const warn = vi.fn();
  const debug = vi.fn();
  class FakeOutboxRelay {
    runOnce = vi.fn(async () => ({ claimed: 0, published: 0, retryScheduled: 0, failed: 0 }));
  }
  return {
    info,
    error,
    warn,
    debug,
    FakeOutboxRelay,
    logger: { info, error, warn, debug },
  };
});

vi.mock('@/infrastructure/outbox/outbox.config.js', () => ({
  outboxConfig: { pollIntervalMs: 1 },
}));
vi.mock('@/infrastructure/outbox/outbox.relay.js', () => ({
  OutboxRelay: FakeOutboxRelay,
}));
vi.mock('@/shared/logger/logger.js', () => ({
  logger,
}));

import { OutboxRelayWorker } from '@/workers/outbox-relay.worker.js';

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe('outbox-relay.worker', () => {
  beforeEach(() => {
    info.mockClear();
    error.mockClear();
  });

  it('runs relay batches until stopped', async () => {
    const relay = new FakeOutboxRelay() as unknown as {
      runOnce: ReturnType<typeof vi.fn>;
    };
    const worker = new OutboxRelayWorker(relay, 1, logger);

    const run = worker.start();
    await delay(5);
    worker.stop();
    await run;

    expect(relay.runOnce).toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith({ pollIntervalMs: 1 }, 'Outbox relay worker started');
    expect(info).toHaveBeenCalledWith('Outbox relay worker stopped');
  });

  it('logs and continues when a relay batch fails', async () => {
    const relay = new FakeOutboxRelay();
    (relay.runOnce as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    const worker = new OutboxRelayWorker(relay, 1, logger);

    const run = worker.start();
    await delay(5);
    worker.stop();
    await run;

    expect(error).toHaveBeenCalledWith({ err: expect.any(Error) }, 'Outbox relay batch failed');
  });

  it('constructs with default relay, poll interval, and logger', () => {
    const worker = new OutboxRelayWorker();
    expect(worker).toBeInstanceOf(OutboxRelayWorker);
  });
});
