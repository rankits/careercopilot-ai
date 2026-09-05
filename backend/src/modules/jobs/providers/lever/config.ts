import { ProviderTier } from '@/modules/jobs/types/job.types.js';

export interface LeverSiteConfig {
  readonly site: string;
  readonly companyName?: string;
  /** Use EU host when true. */
  readonly eu?: boolean;
}

export interface LeverProviderConfig {
  readonly sites?: readonly LeverSiteConfig[];
  readonly timeoutMs?: number;
  readonly tier?: ProviderTier;
}
