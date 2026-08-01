import { IJobProvider } from '@/modules/jobs/interfaces/IJobProvider.js';
import { ProviderTier, JobSearchFilters } from '@/modules/jobs/types/job.types.js';
import { ProviderHealth, ProviderRateLimitStatus } from '@/modules/jobs/types/provider.types.js';
import { NormalizedJob } from '@/modules/jobs/models/NormalizedJob.js';
import {
  RecruiteeCompanyConfig,
  RecruiteeProviderConfig,
} from '@/modules/jobs/providers/recruitee/config.js';
import { RecruiteeClient } from '@/modules/jobs/providers/recruitee/client.js';
import { RecruiteeJobMapper } from '@/modules/jobs/providers/recruitee/mapper.js';
import { applyJobSearchFilters } from '@/modules/jobs/utils/provider-mapping.js';
import { jobsLogger } from '@/shared/utils/logger.js';

const DEFAULT_COMPANIES: readonly RecruiteeCompanyConfig[] = [
  { subdomain: 'olx', companyName: 'OLX' },
];

export class RecruiteeJobProvider implements IJobProvider {
  readonly name = 'recruitee';
  readonly tier: ProviderTier;
  readonly isEnabled = true;

  private readonly client: RecruiteeClient;
  private readonly companies: readonly RecruiteeCompanyConfig[];

  constructor(private readonly config: RecruiteeProviderConfig = {}) {
    this.tier = config.tier ?? ProviderTier.PUBLIC;
    this.client = new RecruiteeClient(this.name, config.timeoutMs);
    this.companies =
      config.companies && config.companies.length > 0 ? config.companies : DEFAULT_COMPANIES;
  }

  async fetchJobs(filters: JobSearchFilters): Promise<NormalizedJob[]> {
    jobsLogger.debug(
      {
        provider: this.name,
        companies: this.companies.map((c) => c.subdomain),
        filters,
      },
      'Recruitee provider fetch started',
    );

    const settled = await Promise.allSettled(
      this.companies.map(async (company) => {
        const raw = await this.client.fetchCompanyOffers(company.subdomain);
        const mapper = new RecruiteeJobMapper(company.companyName || company.subdomain, this.tier);
        return mapper.mapMany(raw, this.name);
      }),
    );

    const normalized: NormalizedJob[] = [];
    for (const [index, result] of settled.entries()) {
      if (result.status === 'fulfilled') {
        normalized.push(...result.value);
      } else {
        jobsLogger.warn(
          {
            provider: this.name,
            company: this.companies[index]?.subdomain,
            error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          },
          'Recruitee company fetch failed',
        );
      }
    }

    const filtered = applyJobSearchFilters(normalized, filters);
    jobsLogger.debug(
      { provider: this.name, fetched: filtered.length },
      'Recruitee provider fetch completed',
    );
    return filtered;
  }

  async healthCheck(): Promise<ProviderHealth> {
    return this.client.healthCheck();
  }

  getRateLimitStatus(): ProviderRateLimitStatus {
    return this.client.getRateLimitStatus();
  }
}
