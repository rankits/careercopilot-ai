import { IJobProvider } from '@/modules/jobs/interfaces/IJobProvider.js';
import { ProviderTier, JobSearchFilters } from '@/modules/jobs/types/job.types.js';
import { ProviderHealth, ProviderRateLimitStatus } from '@/modules/jobs/types/provider.types.js';
import { NormalizedJob } from '@/modules/jobs/models/NormalizedJob.js';
import { RemoteJobsOrgProviderConfig } from '@/modules/jobs/providers/remotejobs-org/config.js';
import { RemoteJobsOrgClient } from '@/modules/jobs/providers/remotejobs-org/client.js';
import { RemoteJobsOrgMapper } from '@/modules/jobs/providers/remotejobs-org/mapper.js';
import { applyJobSearchFilters } from '@/modules/jobs/utils/provider-mapping.js';
import { jobsLogger } from '@/shared/utils/logger.js';

export class RemoteJobsOrgProvider implements IJobProvider {
  readonly name = 'remotejobs_org';
  readonly tier: ProviderTier;
  readonly isEnabled = true;

  private readonly client: RemoteJobsOrgClient;
  private readonly mapper: RemoteJobsOrgMapper;

  constructor(private readonly config: RemoteJobsOrgProviderConfig = {}) {
    this.tier = config.tier ?? ProviderTier.PUBLIC;
    this.client = new RemoteJobsOrgClient(
      this.name,
      config.baseUrl,
      config.timeoutMs,
      config.feeds,
    );
    this.mapper = new RemoteJobsOrgMapper(this.tier);
  }

  async fetchJobs(filters: JobSearchFilters): Promise<NormalizedJob[]> {
    jobsLogger.debug({ provider: this.name, filters }, 'RemoteJobs.org provider fetch started');
    const raw = await this.client.fetchJobs();
    const normalized = applyJobSearchFilters(this.mapper.mapMany(raw, this.name), filters);
    jobsLogger.debug(
      { provider: this.name, fetched: normalized.length },
      'RemoteJobs.org provider fetch completed',
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
