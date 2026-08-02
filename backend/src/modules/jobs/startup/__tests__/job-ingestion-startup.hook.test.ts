import { describe, expect, it, vi } from 'vitest';
import { JobIngestionStartupHook } from '@/modules/jobs/startup/job-ingestion-startup.hook.js';
import type { ICacheService } from '@/infrastructure/cache/cache.interface.js';
import type { JobsService } from '@/modules/jobs/services/jobs.service.js';
import { env } from '@/shared/config/env.conf.js';

const snapshot = {
  JOB_INGESTION_ON_STARTUP_ENABLED: env.JOB_INGESTION_ON_STARTUP_ENABLED,
  JOB_INGESTION_ON_STARTUP_DELAY_MS: env.JOB_INGESTION_ON_STARTUP_DELAY_MS,
  JOB_INGESTION_ON_STARTUP_FAIL_APPLICATION: env.JOB_INGESTION_ON_STARTUP_FAIL_APPLICATION,
  JOB_INGESTION_ON_STARTUP_LOCK_TTL_SECONDS: env.JOB_INGESTION_ON_STARTUP_LOCK_TTL_SECONDS,
  JOB_INGESTION_ON_STARTUP_PROVIDERS: env.JOB_INGESTION_ON_STARTUP_PROVIDERS,
  JOB_INGESTION_ON_STARTUP_ALLOWED_TIERS: env.JOB_INGESTION_ON_STARTUP_ALLOWED_TIERS,
};

const restoreEnv = () => Object.assign(env, snapshot);

describe('JobIngestionStartupHook', () => {
  it('skips when disabled', async () => {
    Object.assign(env, {
      JOB_INGESTION_ON_STARTUP_ENABLED: false,
      JOB_INGESTION_ON_STARTUP_DELAY_MS: 0,
    });
    const jobsService = { triggerBulkIngestion: vi.fn() } as unknown as JobsService;
    const cacheService = {
      tryAcquireLock: vi.fn(),
      releaseLock: vi.fn(),
    } as unknown as ICacheService;

    try {
      const hook = new JobIngestionStartupHook(jobsService, cacheService);
      await expect(hook.run()).resolves.toBe('SKIPPED_DISABLED');
      expect(cacheService.tryAcquireLock).not.toHaveBeenCalled();
    } finally {
      restoreEnv();
    }
  });

  it('skips when lock is unavailable', async () => {
    Object.assign(env, {
      JOB_INGESTION_ON_STARTUP_ENABLED: true,
      JOB_INGESTION_ON_STARTUP_DELAY_MS: 0,
      JOB_INGESTION_ON_STARTUP_LOCK_TTL_SECONDS: 60,
    });
    const jobsService = { triggerBulkIngestion: vi.fn() } as unknown as JobsService;
    const cacheService = {
      tryAcquireLock: vi.fn().mockResolvedValue(false),
      releaseLock: vi.fn(),
    } as unknown as ICacheService;

    try {
      const hook = new JobIngestionStartupHook(jobsService, cacheService);
      await expect(hook.run()).resolves.toBe('SKIPPED_LOCK_UNAVAILABLE');
      expect(jobsService.triggerBulkIngestion).not.toHaveBeenCalled();
    } finally {
      restoreEnv();
    }
  });

  it('runs ingestion and releases lock on success', async () => {
    Object.assign(env, {
      JOB_INGESTION_ON_STARTUP_ENABLED: true,
      JOB_INGESTION_ON_STARTUP_DELAY_MS: 0,
      JOB_INGESTION_ON_STARTUP_LOCK_TTL_SECONDS: 60,
      JOB_INGESTION_ON_STARTUP_PROVIDERS: 'arbeitnow, remotive',
      JOB_INGESTION_ON_STARTUP_ALLOWED_TIERS: 'PUBLIC',
    });
    const jobsService = {
      triggerBulkIngestion: vi.fn().mockResolvedValue({ providers: [] }),
    } as unknown as JobsService;
    const cacheService = {
      tryAcquireLock: vi.fn().mockResolvedValue(true),
      releaseLock: vi.fn().mockResolvedValue(undefined),
    } as unknown as ICacheService;

    try {
      const hook = new JobIngestionStartupHook(jobsService, cacheService);
      await expect(hook.run()).resolves.toBe('COMPLETED');
      expect(jobsService.triggerBulkIngestion).toHaveBeenCalledWith({
        providers: ['arbeitnow', 'remotive'],
        allowedTiers: ['PUBLIC'],
      });
      expect(cacheService.releaseLock).toHaveBeenCalled();
    } finally {
      restoreEnv();
    }
  });

  it('releases the lock on failure when fail-application is false', async () => {
    Object.assign(env, {
      JOB_INGESTION_ON_STARTUP_ENABLED: true,
      JOB_INGESTION_ON_STARTUP_DELAY_MS: 0,
      JOB_INGESTION_ON_STARTUP_FAIL_APPLICATION: false,
      JOB_INGESTION_ON_STARTUP_LOCK_TTL_SECONDS: 60,
    });
    const jobsService = {
      triggerBulkIngestion: vi.fn().mockRejectedValue(new Error('ingestion failed')),
    } as unknown as JobsService;
    const cacheService = {
      tryAcquireLock: vi.fn().mockResolvedValue(true),
      releaseLock: vi.fn().mockResolvedValue(undefined),
    } as unknown as ICacheService;

    try {
      const hook = new JobIngestionStartupHook(jobsService, cacheService);
      await expect(hook.run()).resolves.toBe('FAILED');
      expect(cacheService.releaseLock).toHaveBeenCalled();
    } finally {
      restoreEnv();
    }
  });
});
