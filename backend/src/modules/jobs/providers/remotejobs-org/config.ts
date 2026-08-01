import { ProviderTier } from '@/modules/jobs/types/job.types.js';

export interface RemoteJobsOrgFeedQuery {
  readonly category?: string;
  readonly limit?: number;
  readonly location?: string;
}

export interface RemoteJobsOrgProviderConfig {
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  readonly feeds?: readonly RemoteJobsOrgFeedQuery[];
  readonly tier?: ProviderTier;
}
