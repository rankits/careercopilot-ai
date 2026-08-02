import { ProviderTier } from '@/modules/jobs/types/job.types.js';
import type { PersonioAccountConfig } from '@/modules/jobs/providers/personio/types.js';

export interface PersonioProviderConfig {
  readonly accounts?: readonly PersonioAccountConfig[];
  readonly timeoutMs?: number;
  readonly language?: string;
  readonly tier?: ProviderTier;
}
