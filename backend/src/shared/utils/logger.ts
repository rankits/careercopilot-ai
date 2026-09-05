import { logger } from '@/shared/logger/logger.js';

/**
 * Compat shim: this used to be a separate pino instance (config via
 * LOGGING_ENABLED/LOG_PRETTY) parallel to `shared/logger/logger.ts`'s
 * validated-env, secret-redacting logger. Re-exporting the canonical
 * logger here means every existing `appLogger`/`jobsLogger` call site
 * (jobs/resumes modules, the response interceptor) keeps working
 * unchanged, while the app has a single logging implementation and those
 * modules gain secret redaction for free.
 */
export const appLogger = logger;
export const jobsLogger = logger.child({ scope: 'jobs' });
