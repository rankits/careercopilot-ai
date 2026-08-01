import { messageBus } from '@/infrastructure/messaging/index.js';
import { prepareOutboxRelayTopology } from '@/infrastructure/outbox/index.js';
import { connectDatabase, disconnectDatabase } from '@/shared/config/db.conf.js';
import { logger } from '@/shared/logger/logger.js';
import { OutboxRelayWorker } from '@/workers/outbox-relay.worker.js';

const worker = new OutboxRelayWorker();
let shuttingDown = false;
let runPromise: Promise<void> | undefined;

const shutdown = async (signal: string): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Stopping outbox relay');
  worker.stop();
  await runPromise;
  await messageBus.close();
  await disconnectDatabase();
};

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));

const start = async (): Promise<void> => {
  await connectDatabase();
  await messageBus.connect();
  await prepareOutboxRelayTopology();
  runPromise = worker.start();
  await runPromise;
};

start().catch((error: unknown) => {
  logger.error({ error }, 'Outbox relay worker failed');
  process.exitCode = 1;
});
