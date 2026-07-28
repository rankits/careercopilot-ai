import { IJobProvider } from "../../interfaces/IJobProvider.js";
import { ProviderTier, JobSearchFilters } from "../../types/job.types.js";
import {
  ProviderHealth,
  ProviderRateLimitStatus,
} from "../../types/provider.types.js";
import { NormalizedJob } from "../../models/NormalizedJob.js";
import { LeverProviderConfig } from "./config.js";
import { LeverClient } from "./client.js";
import { LeverJobMapper } from "./mapper.js";

export class LeverJobProvider implements IJobProvider {
  readonly name = "lever";
  readonly tier: ProviderTier;
  readonly isEnabled = true;

  private readonly client: LeverClient;
  private readonly mapper: LeverJobMapper;

  constructor(private readonly config: LeverProviderConfig) {
    this.tier = config.tier ?? ProviderTier.FREE_AUTH;
    this.client = new LeverClient(this.name, config.baseUrl, config.timeoutMs);
    this.mapper = new LeverJobMapper(config.companyId, this.tier);
  }

  async fetchJobs(filters: JobSearchFilters): Promise<NormalizedJob[]> {
    const rawPostings = await this.client.fetchPostings(this.config.companyId);
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
