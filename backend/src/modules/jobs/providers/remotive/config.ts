import { ProviderTier } from '@/modules/jobs/types/job.types.js';

export interface RemotiveProviderConfig {
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  /** Remotive search term — use multiple queries for broader coverage. */
  readonly searches?: readonly string[];
  readonly tier?: ProviderTier;
}
