import { ProviderTier } from '@/modules/jobs/types/job.types.js';

export interface RemoteOkProviderConfig {
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  readonly tier?: ProviderTier;
}
