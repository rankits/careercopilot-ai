import { messageBus } from '@/infrastructure/messaging/index.js';
import { connectDatabase, disconnectDatabase } from '@/shared/config/db.conf.js';
import { logger } from '@/shared/logger/logger.js';
import { startResumeAnalysisWorker } from '@/workers/resume-analysis.worker.js';

let shuttingDown = false;

const shutdown = async (signal: string): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Stopping resume analysis worker');
  await messageBus.close();
  await disconnectDatabase();
};

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));

const start = async (): Promise<void> => {
  await connectDatabase();
  await messageBus.connect();
  await startResumeAnalysisWorker();
};

start().catch((error: unknown) => {
  logger.error({ err: error }, 'Resume analysis worker failed to start');
  process.exitCode = 1;
});
