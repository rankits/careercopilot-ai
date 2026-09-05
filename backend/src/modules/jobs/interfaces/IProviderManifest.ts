import { ProviderTier } from '@/modules/jobs/types/job.types.js';

export type RetryPolicyType = 'exponential' | 'linear' | 'fixed';

export interface IProviderManifest {
  readonly name: string;
  readonly priority: number;
  readonly tier: ProviderTier;
  readonly supportsPagination: boolean;
  readonly supportsIncrementalSync: boolean;
  readonly rateLimitPerMinute: number;
  readonly batchSize: number;
  readonly concurrency: number;
  readonly retryPolicy: RetryPolicyType;
  readonly enabled: boolean;
}
