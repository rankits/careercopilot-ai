import { NormalizedJob } from "@/modules/jobs/models/NormalizedJob.js";
import {
  JobSearchFilters,
  PaginationOptions,
  PaginatedResult,
} from "@/modules/jobs/types/job.types.js";

export interface IJobRepository {
  upsertMany(jobs: NormalizedJob[]): Promise<{ count: number }>;
  findById(id: string): Promise<NormalizedJob | null>;
  search(
    filters: JobSearchFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<NormalizedJob>>;
  deleteExpiredBefore(timestamp: string): Promise<{ count: number }>;
}

