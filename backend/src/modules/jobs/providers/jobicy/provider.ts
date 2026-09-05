import { IJobProvider } from '@/modules/jobs/interfaces/IJobProvider.js';
import { ProviderTier, JobSearchFilters } from '@/modules/jobs/types/job.types.js';
import { ProviderHealth, ProviderRateLimitStatus } from '@/modules/jobs/types/provider.types.js';
import { NormalizedJob } from '@/modules/jobs/models/NormalizedJob.js';
import { JobicyProviderConfig } from '@/modules/jobs/providers/jobicy/config.js';
import { JobicyClient } from '@/modules/jobs/providers/jobicy/client.js';
import { JobicyJobMapper } from '@/modules/jobs/providers/jobicy/mapper.js';
import { applyJobSearchFilters } from '@/modules/jobs/utils/provider-mapping.js';
import { jobsLogger } from '@/shared/utils/logger.js';

export class JobicyJobProvider implements IJobProvider {
  readonly name = 'jobicy';
  readonly tier: ProviderTier;
  readonly isEnabled = true;

  private readonly client: JobicyClient;
  private readonly mapper: JobicyJobMapper;

  constructor(private readonly config: JobicyProviderConfig = {}) {
    this.tier = config.tier ?? ProviderTier.PUBLIC;
    this.client = new JobicyClient(this.name, config.baseUrl, config.timeoutMs, config.feeds);
    this.mapper = new JobicyJobMapper(this.tier);
  }

  async fetchJobs(filters: JobSearchFilters): Promise<NormalizedJob[]> {
    jobsLogger.debug({ provider: this.name, filters }, 'Jobicy provider fetch started');
    const raw = await this.client.fetchJobs();
    const normalized = applyJobSearchFilters(this.mapper.mapMany(raw, this.name), filters);
    jobsLogger.debug(
      { provider: this.name, fetched: normalized.length },
      'Jobicy provider fetch completed',
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
