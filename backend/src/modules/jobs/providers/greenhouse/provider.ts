import { IJobProvider } from "../../interfaces/IJobProvider.js";
import { ProviderTier, JobSearchFilters } from "../../types/job.types.js";
import {
  ProviderHealth,
  ProviderRateLimitStatus,
} from "../../types/provider.types.js";
import { NormalizedJob } from "../../models/NormalizedJob.js";
import { GreenhouseProviderConfig } from "./config.js";
import { GreenhouseClient } from "./client.js";
import { GreenhouseJobMapper } from "./mapper.js";

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

    return normalized;
  }

  async healthCheck(): Promise<ProviderHealth> {
    return this.client.healthCheck();
  }

  getRateLimitStatus(): ProviderRateLimitStatus {
    return this.client.getRateLimitStatus();
  }
}
