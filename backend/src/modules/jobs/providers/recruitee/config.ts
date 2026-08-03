import { ProviderTier } from '@/modules/jobs/types/job.types.js';

export interface RecruiteeCompanyConfig {
  readonly subdomain: string;
  readonly companyName?: string;
}

export interface RecruiteeProviderConfig {
  readonly companies?: readonly RecruiteeCompanyConfig[];
  readonly timeoutMs?: number;
  readonly tier?: ProviderTier;
}
