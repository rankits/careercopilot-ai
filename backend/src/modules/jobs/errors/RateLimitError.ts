import { JobModuleError } from '@/modules/jobs/errors/JobModuleError.js';

export class RateLimitError extends JobModuleError {
  readonly providerName: string;
  readonly retryAfterMs?: number;

  constructor(providerName: string, retryAfterMs?: number) {
    super(`[Provider: ${providerName}] Rate limit exceeded`, 429);
    this.providerName = providerName;
    this.retryAfterMs = retryAfterMs;
  }
}
