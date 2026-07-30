import { IJobProvider } from "@/modules/jobs/interfaces/IJobProvider.js";
import { ProviderTier, JobSearchFilters } from "@/modules/jobs/types/job.types.js";
import {
  ProviderHealth,
  ProviderRateLimitStatus,
} from "@/modules/jobs/types/provider.types.js";
import { NormalizedJob } from "@/modules/jobs/models/NormalizedJob.js";
import { GreenhouseProviderConfig } from "@/modules/jobs/providers/greenhouse/config.js";
import { GreenhouseClient } from "@/modules/jobs/providers/greenhouse/client.js";
import { GreenhouseJobMapper } from "@/modules/jobs/providers/greenhouse/mapper.js";
import { jobsLogger } from "@/shared/utils/logger.js";

export class GreenhouseJobProvider implements IJobProvider {
  readonly name = "greenhouse";
  readonly tier: ProviderTier;
  readonly isEnabled = true;

  private readonly client: GreenhouseClient;
  private readonly mapper: GreenhouseJobMapper;

  constructor(private readonly config: GreenhouseProviderConfig) {
    this.tier = config.tier ?? ProviderTier.PUBLIC;
    this.client = new GreenhouseClient(
      this.name,
      config.baseUrl,
      config.timeoutMs
    );
    const companyName = config.companyName || config.boardToken;
    this.mapper = new GreenhouseJobMapper(companyName, this.tier);
  }

  async fetchJobs(filters: JobSearchFilters): Promise<NormalizedJob[]> {
    jobsLogger.debug(
      {
        provider: this.name,
        boardToken: this.config.boardToken,
        filters,
      },
      "Greenhouse provider fetch started",
    );
    const rawPostings = await this.client.fetchBoardJobs(
      this.config.boardToken
    );
    let normalized = this.mapper.mapMany(rawPostings, this.name);

    if (filters.query) {
      const q = filters.query.toLowerCase();
      normalized = normalized.filter(
        (job) =>
          job.title.toLowerCase().includes(q) ||
          job.description.toLowerCase().includes(q)
      );
    }

    if (filters.location) {
      const loc = filters.location.toLowerCase();
      normalized = normalized.filter((job) =>
        job.location.raw.toLowerCase().includes(loc)
      );
    }

    if (filters.isRemote !== undefined) {
      normalized = normalized.filter(
        (job) => job.location.isRemote === filters.isRemote
      );
    }

    jobsLogger.debug(
      {
        provider: this.name,
        fetched: normalized.length,
      },
      "Greenhouse provider fetch completed",
    );

    return normalized;
  }

  async healthCheck(): Promise<ProviderHealth> {
    jobsLogger.debug({ provider: this.name }, "Greenhouse provider health check started");
    const health = await this.client.healthCheck();
    jobsLogger.debug(
      {
        provider: this.name,
        status: health.status,
      },
      "Greenhouse provider health check completed",
    );
    return health;
  }

  getRateLimitStatus(): ProviderRateLimitStatus {
    return this.client.getRateLimitStatus();
  }
}

