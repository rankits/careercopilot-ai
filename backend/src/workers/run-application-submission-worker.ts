import { messageBus } from '@/infrastructure/messaging/index.js';
import { connectDatabase, disconnectDatabase } from '@/shared/config/db.conf.js';
import { logger } from '@/shared/logger/logger.js';
import { startApplicationSubmissionWorker } from '@/workers/application-submission.worker.js';
import { drainWorker } from '@/workers/graceful-worker-drain.js';

const DEFAULT_DRAIN_TIMEOUT_MS = 30_000;

function resolveDrainTimeoutMs(): number {
  const raw = process.env.APPLICATION_SUBMISSION_WORKER_DRAIN_TIMEOUT_MS;
  if (raw === undefined || raw === '') return DEFAULT_DRAIN_TIMEOUT_MS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_DRAIN_TIMEOUT_MS;
}

let shuttingDown = false;

const shutdown = async (signal: string): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;

  try {
    await drainWorker(signal, {
      cancelConsumers: () => messageBus.cancelConsumers(),
      waitForInFlight: (timeoutMs) => messageBus.waitForInFlight(timeoutMs),
      closeMessageBus: () => messageBus.close(),
      disconnectDatabase,
      drainTimeoutMs: resolveDrainTimeoutMs(),
      log: logger,
      exit: (code) => {
        process.exit(code);
      },
    });
  } catch (error) {
    logger.error({ err: error, signal }, 'Error during application submission worker drain');
    process.exit(1);
  }
};

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));

const start = async (): Promise<void> => {
  await connectDatabase();
  await messageBus.connect();
  await startApplicationSubmissionWorker();
};

start().catch((err: Error) => {
  logger.error({ err }, 'Failed to start application submission worker');
  process.exit(1);
});
