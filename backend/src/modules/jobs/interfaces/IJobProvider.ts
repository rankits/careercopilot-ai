import { ProviderTier, JobSearchFilters } from "../types/job.types.js";
import {
  ProviderHealth,
  ProviderRateLimitStatus,
} from "../types/provider.types.js";
import { NormalizedJob } from "../models/NormalizedJob.js";
import { IProviderManifest } from "./IProviderManifest.js";

export interface IJobProvider {
  readonly name: string;
  readonly tier: ProviderTier;
  readonly isEnabled: boolean;
  readonly manifest?: IProviderManifest;

  fetchJobs(filters: JobSearchFilters): Promise<NormalizedJob[]>;
  healthCheck(): Promise<ProviderHealth>;
  getRateLimitStatus(): ProviderRateLimitStatus;
}
