import { messageBus } from '@/infrastructure/messaging/index.js';
import { connectDatabase, disconnectDatabase } from '@/shared/config/db.conf.js';
import { logger } from '@/shared/logger/logger.js';
import { startJobEmbeddingWorker } from '@/workers/job-embedding.worker.js';

let shuttingDown = false;

const shutdown = async (signal: string): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Stopping job embedding worker');
  await messageBus.close();
  await disconnectDatabase();
};

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));

const start = async (): Promise<void> => {
  await connectDatabase();
  await messageBus.connect();
  await startJobEmbeddingWorker();
};

start().catch((error: unknown) => {
  logger.error({ err: error }, 'Job embedding worker failed to start');
  process.exitCode = 1;
});
