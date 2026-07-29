import { ProviderTier, JobSearchFilters } from "@/modules/jobs/types/job.types.js";
import {
  ProviderHealth,
  ProviderRateLimitStatus,
} from "@/modules/jobs/types/provider.types.js";
import { NormalizedJob } from "@/modules/jobs/models/NormalizedJob.js";
import { IProviderManifest } from "@/modules/jobs/interfaces/IProviderManifest.js";

export interface IJobProvider {
  readonly name: string;
  readonly tier: ProviderTier;
  readonly isEnabled: boolean;
  readonly manifest?: IProviderManifest;

  fetchJobs(filters: JobSearchFilters): Promise<NormalizedJob[]>;
  healthCheck(): Promise<ProviderHealth>;
  getRateLimitStatus(): ProviderRateLimitStatus;
}

