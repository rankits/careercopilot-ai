import { startEmailWorker } from '@/workers/email.worker.js';
import { logger } from '@/shared/logger/logger.js';

startEmailWorker().catch((err: Error) => {
  logger.error({ err }, 'Failed to start email worker');
  process.exit(1);
});
