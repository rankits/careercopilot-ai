import { ProviderTier } from '@/modules/jobs/types/job.types.js';

export interface AshbyBoardConfig {
  readonly boardName: string;
  readonly companyName?: string;
}

export interface AshbyProviderConfig {
  readonly boards?: readonly AshbyBoardConfig[];
  readonly timeoutMs?: number;
  readonly includeCompensation?: boolean;
  readonly tier?: ProviderTier;
}
