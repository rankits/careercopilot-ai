import { IJobProvider } from '@/modules/jobs/interfaces/IJobProvider.js';
import { ProviderTier, JobSearchFilters } from '@/modules/jobs/types/job.types.js';
import { ProviderHealth, ProviderRateLimitStatus } from '@/modules/jobs/types/provider.types.js';
import { NormalizedJob } from '@/modules/jobs/models/NormalizedJob.js';
import { RemotiveProviderConfig } from '@/modules/jobs/providers/remotive/config.js';
import { RemotiveClient } from '@/modules/jobs/providers/remotive/client.js';
import { RemotiveJobMapper } from '@/modules/jobs/providers/remotive/mapper.js';
import { applyJobSearchFilters } from '@/modules/jobs/utils/provider-mapping.js';
import { jobsLogger } from '@/shared/utils/logger.js';

export class RemotiveJobProvider implements IJobProvider {
  readonly name = 'remotive';
  readonly tier: ProviderTier;
  readonly isEnabled = true;

  private readonly client: RemotiveClient;
  private readonly mapper: RemotiveJobMapper;

  constructor(private readonly config: RemotiveProviderConfig = {}) {
    this.tier = config.tier ?? ProviderTier.PUBLIC;
    this.client = new RemotiveClient(this.name, config.baseUrl, config.timeoutMs, config.searches);
    this.mapper = new RemotiveJobMapper(this.tier);
  }

  async fetchJobs(filters: JobSearchFilters): Promise<NormalizedJob[]> {
    jobsLogger.debug({ provider: this.name, filters }, 'Remotive provider fetch started');
    const raw = await this.client.fetchJobs();
    const normalized = applyJobSearchFilters(this.mapper.mapMany(raw, this.name), filters);
    jobsLogger.debug(
      { provider: this.name, fetched: normalized.length },
      'Remotive provider fetch completed',
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
