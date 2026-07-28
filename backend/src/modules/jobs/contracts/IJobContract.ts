import {
  JobSearchFilters,
  PaginationOptions,
  PaginatedResult,
  BulkIngestionOptions,
  BulkIngestionSummary,
} from "../types/job.types.js";
import { ProviderHealth } from "../types/provider.types.js";
import { NormalizedJob } from "../models/NormalizedJob.js";

export interface IJobContract {
  searchJobs(
    filters: JobSearchFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<NormalizedJob>>;

  getJobById(jobId: string): Promise<NormalizedJob | null>;

  triggerBulkIngestion(
    options?: BulkIngestionOptions
  ): Promise<BulkIngestionSummary>;

  getProviderHealth(): Promise<Record<string, ProviderHealth>>;
}
