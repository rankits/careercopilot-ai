import { IJobProvider } from '@/modules/jobs/interfaces/IJobProvider.js';
import { ProviderTier, JobSearchFilters } from '@/modules/jobs/types/job.types.js';
import { ProviderHealth, ProviderRateLimitStatus } from '@/modules/jobs/types/provider.types.js';
import { NormalizedJob } from '@/modules/jobs/models/NormalizedJob.js';
import { HimalayasProviderConfig } from '@/modules/jobs/providers/himalayas/config.js';
import { HimalayasClient } from '@/modules/jobs/providers/himalayas/client.js';
import { HimalayasJobMapper } from '@/modules/jobs/providers/himalayas/mapper.js';
import { applyJobSearchFilters } from '@/modules/jobs/utils/provider-mapping.js';
import { jobsLogger } from '@/shared/utils/logger.js';

export class HimalayasJobProvider implements IJobProvider {
  readonly name = 'himalayas';
  readonly tier: ProviderTier;
  readonly isEnabled = true;

  private readonly client: HimalayasClient;
  private readonly mapper: HimalayasJobMapper;

  constructor(private readonly config: HimalayasProviderConfig = {}) {
    this.tier = config.tier ?? ProviderTier.PUBLIC;
    this.client = new HimalayasClient(
      this.name,
      config.browseBaseUrl,
      config.searchBaseUrl,
      config.timeoutMs,
      config.browse,
      config.searches,
    );
    this.mapper = new HimalayasJobMapper(this.tier);
  }

  async fetchJobs(filters: JobSearchFilters): Promise<NormalizedJob[]> {
    jobsLogger.debug({ provider: this.name, filters }, 'Himalayas provider fetch started');
    const raw = await this.client.fetchJobs();
    const normalized = applyJobSearchFilters(this.mapper.mapMany(raw, this.name), filters);
    jobsLogger.debug(
      { provider: this.name, fetched: normalized.length },
      'Himalayas provider fetch completed',
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
