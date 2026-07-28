import {
  ProviderHealth,
  ProviderHealthStatus,
  ProviderRateLimitStatus,
} from "../../types/provider.types.js";
import { ProviderFetchError } from "../../errors/ProviderFetchError.js";
import { RateLimitError } from "../../errors/RateLimitError.js";
import { calculateJitteredBackoff, sleep } from "../../utils/backoff.js";

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

  protected async executeWithRetry<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    if (this.circuitStatus === ProviderHealthStatus.CIRCUIT_OPEN) {
      throw new ProviderFetchError(
        this.options.providerName,
        "Circuit breaker is OPEN due to consecutive failures"
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

        if (error instanceof RateLimitError) {
          const waitMs = error.retryAfterMs ?? 2000;
          await sleep(waitMs);
          continue;
        }

        if (attempt < maxRetries) {
          const backoffMs = calculateJitteredBackoff(attempt);
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

    throw new ProviderFetchError(
      this.options.providerName,
      `Failed to fetch after ${maxRetries} attempts`,
      lastError
    );
  }
}
