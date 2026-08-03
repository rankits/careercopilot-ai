import { ProviderTier } from '@/modules/jobs/types/job.types.js';

export interface JobicyFeedQuery {
  readonly count?: number;
  readonly geo?: string;
  readonly industry?: string;
  readonly tag?: string;
}

export interface JobicyProviderConfig {
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  readonly feeds?: readonly JobicyFeedQuery[];
  readonly tier?: ProviderTier;
}
