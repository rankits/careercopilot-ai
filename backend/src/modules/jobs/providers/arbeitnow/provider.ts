import { IJobProvider } from "@/modules/jobs/interfaces/IJobProvider.js";
import { ProviderTier, JobSearchFilters } from "@/modules/jobs/types/job.types.js";
import {
  ProviderHealth,
  ProviderRateLimitStatus,
} from "@/modules/jobs/types/provider.types.js";
import { NormalizedJob } from "@/modules/jobs/models/NormalizedJob.js";
import { ArbeitnowProviderConfig } from "@/modules/jobs/providers/arbeitnow/config.js";
import { ArbeitnowClient } from "@/modules/jobs/providers/arbeitnow/client.js";
import { ArbeitnowJobMapper } from "@/modules/jobs/providers/arbeitnow/mapper.js";
import { jobsLogger } from "@/shared/utils/logger.js";

export class ArbeitnowJobProvider implements IJobProvider {
  readonly name = "arbeitnow";
  readonly tier: ProviderTier;
  readonly isEnabled = true;

  private readonly client: ArbeitnowClient;
  private readonly mapper: ArbeitnowJobMapper;

  constructor(private readonly config: ArbeitnowProviderConfig = {}) {
    this.tier = config.tier ?? ProviderTier.PUBLIC;
    this.client = new ArbeitnowClient(
      this.name,
      config.baseUrl,
      config.timeoutMs,
      config.maxPages,
    );
    this.mapper = new ArbeitnowJobMapper(this.tier);
  }

  async fetchJobs(filters: JobSearchFilters): Promise<NormalizedJob[]> {
    jobsLogger.debug(
      {
        provider: this.name,
        baseUrl: this.config.baseUrl,
        filters,
      },
      "Arbeitnow provider fetch started",
    );

    const rawPostings = await this.client.fetchFeedJobs();
    let normalized = this.mapper.mapMany(rawPostings, this.name);

    if (filters.query) {
      const q = filters.query.toLowerCase();
      normalized = normalized.filter(
        (job) =>
          job.title.toLowerCase().includes(q) ||
          job.companyName.toLowerCase().includes(q) ||
          job.description.toLowerCase().includes(q),
      );
    }

    if (filters.company) {
      const company = filters.company.toLowerCase();
      normalized = normalized.filter((job) => job.companyName.toLowerCase().includes(company));
    }

    if (filters.location) {
      const loc = filters.location.toLowerCase();
      normalized = normalized.filter(
        (job) =>
          job.location.raw.toLowerCase().includes(loc) ||
          job.location.city?.toLowerCase().includes(loc) === true,
      );
    }

    if (filters.isRemote !== undefined) {
      normalized = normalized.filter((job) => job.location.isRemote === filters.isRemote);
    }

    jobsLogger.debug(
      {
        provider: this.name,
        fetched: normalized.length,
      },
      "Arbeitnow provider fetch completed",
    );

    return normalized;
  }

  async healthCheck(): Promise<ProviderHealth> {
    jobsLogger.debug({ provider: this.name }, "Arbeitnow provider health check started");
    const health = await this.client.healthCheck();
    jobsLogger.debug(
      {
        provider: this.name,
        status: health.status,
      },
      "Arbeitnow provider health check completed",
    );
    return health;
  }

  getRateLimitStatus(): ProviderRateLimitStatus {
    return this.client.getRateLimitStatus();
  }
}
