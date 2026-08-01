import { ProviderTier } from '@/modules/jobs/types/job.types.js';

export interface GreenhouseBoardConfig {
  readonly boardToken: string;
  readonly companyName?: string;
}

export interface GreenhouseProviderConfig {
  /** Preferred: multiple probed boards for broader coverage. */
  readonly boards?: readonly GreenhouseBoardConfig[];
  /** Legacy single-board fields (used when boards is omitted). */
  readonly boardToken?: string;
  readonly companyName?: string;
  readonly tier?: ProviderTier;
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  readonly includeContent?: boolean;
}
