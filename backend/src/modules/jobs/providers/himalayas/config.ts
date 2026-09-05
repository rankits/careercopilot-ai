import { ProviderTier } from '@/modules/jobs/types/job.types.js';

export interface HimalayasBrowseQuery {
  readonly limit?: number;
  readonly offset?: number;
}

export interface HimalayasSearchQuery {
  readonly q?: string;
  readonly country?: string;
}

export interface HimalayasProviderConfig {
  readonly browseBaseUrl?: string;
  readonly searchBaseUrl?: string;
  readonly timeoutMs?: number;
  readonly browse?: HimalayasBrowseQuery;
  readonly searches?: readonly HimalayasSearchQuery[];
  readonly tier?: ProviderTier;
}
