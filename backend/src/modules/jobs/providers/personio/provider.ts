import { IJobProvider } from '@/modules/jobs/interfaces/IJobProvider.js';
import { ProviderTier, JobSearchFilters } from '@/modules/jobs/types/job.types.js';
import { ProviderHealth, ProviderRateLimitStatus } from '@/modules/jobs/types/provider.types.js';
import { NormalizedJob } from '@/modules/jobs/models/NormalizedJob.js';
import { PersonioProviderConfig } from '@/modules/jobs/providers/personio/config.js';
import { PersonioAccountConfig } from '@/modules/jobs/providers/personio/types.js';
import { PersonioClient } from '@/modules/jobs/providers/personio/client.js';
import { PersonioJobMapper } from '@/modules/jobs/providers/personio/mapper.js';
import { applyJobSearchFilters } from '@/modules/jobs/utils/provider-mapping.js';
import { jobsLogger } from '@/shared/utils/logger.js';

const DEFAULT_ACCOUNTS: readonly PersonioAccountConfig[] = [
  { account: 'acme', companyName: 'Personio Sample' },
];

export class PersonioJobProvider implements IJobProvider {
  readonly name = 'personio';
  readonly tier: ProviderTier;
  readonly isEnabled = true;

  private readonly client: PersonioClient;
  private readonly accounts: readonly PersonioAccountConfig[];

  constructor(private readonly config: PersonioProviderConfig = {}) {
    this.tier = config.tier ?? ProviderTier.PUBLIC;
    this.client = new PersonioClient(this.name, config.timeoutMs, config.language ?? 'en');
    this.accounts =
      config.accounts && config.accounts.length > 0 ? config.accounts : DEFAULT_ACCOUNTS;
  }

  async fetchJobs(filters: JobSearchFilters): Promise<NormalizedJob[]> {
    jobsLogger.debug(
      {
        provider: this.name,
        accounts: this.accounts.map((a) => a.account),
        filters,
      },
      'Personio provider fetch started',
    );

    const settled = await Promise.allSettled(
      this.accounts.map(async (account) => {
        const raw = await this.client.fetchAccountJobs(account.account);
        const mapper = new PersonioJobMapper(
          account.companyName || account.account,
          account.account,
          this.tier,
        );
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
            account: this.accounts[index]?.account,
            error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          },
          'Personio account fetch failed',
        );
      }
    }

    const filtered = applyJobSearchFilters(normalized, filters);
    jobsLogger.debug(
      { provider: this.name, fetched: filtered.length },
      'Personio provider fetch completed',
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
