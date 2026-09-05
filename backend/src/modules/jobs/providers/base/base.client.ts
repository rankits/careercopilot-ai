import {
  ProviderHealth,
  ProviderHealthStatus,
  ProviderRateLimitStatus,
} from '@/modules/jobs/types/provider.types.js';
import { ProviderFetchError } from '@/modules/jobs/errors/ProviderFetchError.js';
import { RateLimitError } from '@/modules/jobs/errors/RateLimitError.js';
import { calculateJitteredBackoff, sleep } from '@/modules/jobs/utils/backoff.js';
import { jobsLogger } from '@/shared/utils/logger.js';

export interface BaseClientOptions {
  readonly providerName: string;
  readonly baseUrl: string;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
}

export abstract class BaseProviderClient {
  protected consecutiveFailures = 0;
  protected circuitStatus = ProviderHealthStatus.HEALTHY;
  protected rateLimitRemaining = 1000;
  protected rateLimitLimit = 1000;
  protected rateLimitResetAt?: string;

  constructor(protected readonly options: BaseClientOptions) {}

  getRateLimitStatus(): ProviderRateLimitStatus {
    return {
      remaining: this.rateLimitRemaining,
      limit: this.rateLimitLimit,
      resetAt: this.rateLimitResetAt,
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      status: this.circuitStatus,
      lastCheckedAt: new Date().toISOString(),
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  protected async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    if (this.circuitStatus === ProviderHealthStatus.CIRCUIT_OPEN) {
      throw new ProviderFetchError(
        this.options.providerName,
        'Circuit breaker is OPEN due to consecutive failures',
      );
    }

    const maxRetries = this.options.maxRetries ?? 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        this.consecutiveFailures = 0;
        this.circuitStatus = ProviderHealthStatus.HEALTHY;
        return result;
      } catch (error) {
        lastError = error;
        const errorMessage = error instanceof Error ? error.message : String(error);

        jobsLogger.warn(
          {
            provider: this.options.providerName,
            attempt,
            maxRetries,
            error: errorMessage,
          },
          'Provider fetch attempt failed',
        );

        if (error instanceof RateLimitError) {
          const waitMs = error.retryAfterMs ?? 2000;
          jobsLogger.warn(
            {
              provider: this.options.providerName,
              attempt,
              waitMs,
            },
            'Provider rate limited, delaying retry',
          );
          await sleep(waitMs);
          continue;
        }

        if (attempt < maxRetries) {
          const backoffMs = calculateJitteredBackoff(attempt);
          jobsLogger.debug(
            {
              provider: this.options.providerName,
              attempt,
              backoffMs,
            },
            'Scheduling provider retry',
          );
          await sleep(backoffMs);
        }
      }
    }

    this.consecutiveFailures++;
    if (this.consecutiveFailures >= 5) {
      this.circuitStatus = ProviderHealthStatus.CIRCUIT_OPEN;
    } else {
      this.circuitStatus = ProviderHealthStatus.DEGRADED;
    }

    const finalErrorMessage = lastError instanceof Error ? lastError.message : String(lastError);

    jobsLogger.error(
      {
        provider: this.options.providerName,
        maxRetries,
        consecutiveFailures: this.consecutiveFailures,
        circuitStatus: this.circuitStatus,
        error: finalErrorMessage,
      },
      'Provider fetch exhausted all retries',
    );

    throw new ProviderFetchError(
      this.options.providerName,
      `Failed to fetch after ${maxRetries} attempts`,
      lastError,
    );
  }
}
