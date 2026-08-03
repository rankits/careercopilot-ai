import { IJobProvider } from '@/modules/jobs/interfaces/IJobProvider.js';
import { ProviderTier, JobSearchFilters } from '@/modules/jobs/types/job.types.js';
import { ProviderHealth, ProviderRateLimitStatus } from '@/modules/jobs/types/provider.types.js';
import { NormalizedJob } from '@/modules/jobs/models/NormalizedJob.js';
import { RemoteOkProviderConfig } from '@/modules/jobs/providers/remoteok/config.js';
import { RemoteOkClient } from '@/modules/jobs/providers/remoteok/client.js';
import { RemoteOkJobMapper } from '@/modules/jobs/providers/remoteok/mapper.js';
import { applyJobSearchFilters } from '@/modules/jobs/utils/provider-mapping.js';
import { jobsLogger } from '@/shared/utils/logger.js';

export class RemoteOkJobProvider implements IJobProvider {
  readonly name = 'remoteok';
  readonly tier: ProviderTier;
  readonly isEnabled = true;

  private readonly client: RemoteOkClient;
  private readonly mapper: RemoteOkJobMapper;

  constructor(private readonly config: RemoteOkProviderConfig = {}) {
    this.tier = config.tier ?? ProviderTier.PUBLIC;
    this.client = new RemoteOkClient(this.name, config.baseUrl, config.timeoutMs);
    this.mapper = new RemoteOkJobMapper(this.tier);
  }

  async fetchJobs(filters: JobSearchFilters): Promise<NormalizedJob[]> {
    jobsLogger.debug({ provider: this.name, filters }, 'Remote OK provider fetch started');
    const raw = await this.client.fetchJobs();
    const normalized = applyJobSearchFilters(this.mapper.mapMany(raw, this.name), filters);
    jobsLogger.debug(
      { provider: this.name, fetched: normalized.length },
      'Remote OK provider fetch completed',
    );
    return normalized;
  }

  async healthCheck(): Promise<ProviderHealth> {
    return this.client.healthCheck();
  }

  getRateLimitStatus(): ProviderRateLimitStatus {
    return this.client.getRateLimitStatus();
  }
}
