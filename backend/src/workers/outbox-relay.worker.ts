import type { Logger } from 'pino';
import { OutboxRelay } from '@/infrastructure/outbox/outbox.relay.js';
import { outboxConfig } from '@/infrastructure/outbox/outbox.config.js';
import { logger } from '@/shared/logger/logger.js';

const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

export class OutboxRelayWorker {
  private stopping = false;

  constructor(
    private readonly relay = new OutboxRelay(),
    private readonly pollIntervalMs = outboxConfig.pollIntervalMs,
    private readonly workerLogger: Logger = logger,
  ) {}

  async start(): Promise<void> {
    this.stopping = false;
    this.workerLogger.info({ pollIntervalMs: this.pollIntervalMs }, 'Outbox relay worker started');
    while (!this.stopping) {
      try {
        await this.relay.runOnce();
      } catch (error) {
        this.workerLogger.error({ err: error }, 'Outbox relay batch failed');
      }
      if (!this.stopping) await wait(this.pollIntervalMs);
    }
    this.workerLogger.info('Outbox relay worker stopped');
  }

  stop(): void {
    this.stopping = true;
  }
}
