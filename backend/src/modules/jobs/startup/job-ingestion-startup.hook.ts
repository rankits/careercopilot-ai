import { jobsLogger } from '@/shared/utils/logger.js';
import { env } from '@/shared/config/env.conf.js';
import type { JobsService } from '@/modules/jobs/services/jobs.service.js';
import type { ICacheService } from '@/infrastructure/cache/cache.interface.js';
import type { ProviderTier } from '@/modules/jobs/types/job.types.js';

export type JobIngestionTriggerSource =
  'MANUAL_API' | 'SERVER_STARTUP' | 'SCHEDULED' | 'RETRY' | 'ADMIN_COMMAND';

export type StartupOutcome =
  | 'STARTED'
  | 'COMPLETED'
  | 'FAILED'
  | 'SKIPPED_DISABLED'
  | 'SKIPPED_LOCK_UNAVAILABLE'
  | 'SKIPPED_ALREADY_RUNNING';

export class JobIngestionStartupHook {
  private readonly LOCK_KEY = 'jobs:ingestion:startup:lock';

  constructor(
    private readonly jobsService: JobsService,
    private readonly cacheService: ICacheService,
  ) {}

  async run(): Promise<StartupOutcome> {
    if (!env.JOB_INGESTION_ON_STARTUP_ENABLED) {
      jobsLogger.info('Startup ingestion skipped (disabled via env)');
      return 'SKIPPED_DISABLED';
    }

    jobsLogger.info(
      { delayMs: env.JOB_INGESTION_ON_STARTUP_DELAY_MS },
      'Startup ingestion enabled, waiting for delay...',
    );

    await new Promise((resolve) => setTimeout(resolve, env.JOB_INGESTION_ON_STARTUP_DELAY_MS));

    const lockTtl = env.JOB_INGESTION_ON_STARTUP_LOCK_TTL_SECONDS;
    const acquired = await this.cacheService.tryAcquireLock(this.LOCK_KEY, lockTtl);

    if (!acquired) {
      jobsLogger.info(
        { lockKey: this.LOCK_KEY },
        'Startup ingestion skipped (lock unavailable - likely running on another instance)',
      );
      return 'SKIPPED_LOCK_UNAVAILABLE';
    }

    jobsLogger.info('Startup ingestion lock acquired. Starting bulk ingestion...');

    try {
      const providers = env.JOB_INGESTION_ON_STARTUP_PROVIDERS?.split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      const allowedTiers = env.JOB_INGESTION_ON_STARTUP_ALLOWED_TIERS?.split(',')
        .map((t) => t.trim() as ProviderTier)
        .filter(Boolean);

      const summary = await this.jobsService.triggerBulkIngestion({
        providers: providers?.length ? providers : undefined,
        allowedTiers: allowedTiers?.length ? allowedTiers : undefined,
      });

      jobsLogger.info(
        { summary, triggerSource: 'SERVER_STARTUP' },
        'Startup ingestion completed successfully',
      );

      return 'COMPLETED';
    } catch (error) {
      jobsLogger.error({ err: error, triggerSource: 'SERVER_STARTUP' }, 'Startup ingestion failed');

      if (env.JOB_INGESTION_ON_STARTUP_FAIL_APPLICATION) {
        throw error;
      }

      return 'FAILED';
    } finally {
      // Always release after the attempt. TTL remains the crash-recovery fallback.
      await this.cacheService.releaseLock(this.LOCK_KEY).catch((err) => {
        jobsLogger.error({ err }, 'Failed to release startup ingestion lock');
      });
    }
  }
}
