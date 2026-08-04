import { startApplicationSubmissionWorker } from '@/workers/application-submission.worker.js';
import { logger } from '@/shared/logger/logger.js';

startApplicationSubmissionWorker().catch((err: Error) => {
  logger.error({ err }, 'Failed to start application submission worker');
  process.exit(1);
});
