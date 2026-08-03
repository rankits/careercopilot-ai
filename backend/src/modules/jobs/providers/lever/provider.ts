import { IJobProvider } from '@/modules/jobs/interfaces/IJobProvider.js';
import { ProviderTier, JobSearchFilters } from '@/modules/jobs/types/job.types.js';
import { ProviderHealth, ProviderRateLimitStatus } from '@/modules/jobs/types/provider.types.js';
import { NormalizedJob } from '@/modules/jobs/models/NormalizedJob.js';
import { LeverProviderConfig, LeverSiteConfig } from '@/modules/jobs/providers/lever/config.js';
import { LeverClient } from '@/modules/jobs/providers/lever/client.js';
import { LeverJobMapper } from '@/modules/jobs/providers/lever/mapper.js';
import { applyJobSearchFilters } from '@/modules/jobs/utils/provider-mapping.js';
import { jobsLogger } from '@/shared/utils/logger.js';

const DEFAULT_SITES: readonly LeverSiteConfig[] = [
  { site: 'leverdemo', companyName: 'Lever Demo' },
  { site: 'spotify', companyName: 'Spotify' },
  { site: 'palantir', companyName: 'Palantir' },
];

export class LeverJobProvider implements IJobProvider {
  readonly name = 'lever';
  readonly tier: ProviderTier;
  readonly isEnabled = true;

  private readonly client: LeverClient;
  private readonly sites: readonly LeverSiteConfig[];

  constructor(private readonly config: LeverProviderConfig = {}) {
    this.tier = config.tier ?? ProviderTier.PUBLIC;
    this.client = new LeverClient(this.name, config.timeoutMs);
    this.sites = config.sites && config.sites.length > 0 ? config.sites : DEFAULT_SITES;
  }

  async fetchJobs(filters: JobSearchFilters): Promise<NormalizedJob[]> {
    jobsLogger.debug(
      { provider: this.name, sites: this.sites.map((s) => s.site), filters },
      'Lever provider fetch started',
    );

    const settled = await Promise.allSettled(
      this.sites.map(async (site) => {
        const raw = await this.client.fetchSiteJobs(site.site, site.eu === true);
        const mapper = new LeverJobMapper(site.companyName || site.site, this.tier);
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
            site: this.sites[index]?.site,
            error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          },
          'Lever site fetch failed',
        );
      }
    }

    const filtered = applyJobSearchFilters(normalized, filters);
    jobsLogger.debug(
      { provider: this.name, fetched: filtered.length },
      'Lever provider fetch completed',
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
