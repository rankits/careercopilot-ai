import { IJobContract } from "../contracts/IJobContract.js";
import {
  JobSearchFilters,
  PaginationOptions,
  PaginatedResult,
  BulkIngestionOptions,
  BulkIngestionSummary,
} from "../types/job.types.js";
import { ProviderHealth } from "../types/provider.types.js";
import { NormalizedJob } from "../models/NormalizedJob.js";
import { AggregationService } from "./aggregation/aggregation.service.js";
import { IJobProviderRegistry } from "../registry/job-provider.registry.js";

export class JobsService implements IJobContract {
  constructor(
    private readonly aggregationService: AggregationService,
    private readonly providerRegistry: IJobProviderRegistry
  ) {}

  async searchJobs(
    filters: JobSearchFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<NormalizedJob>> {
    const aggregationResult =
      await this.aggregationService.aggregateJobs(filters);

    const page = Math.max(1, pagination.page ?? 1);
    const limit = Math.max(1, Math.min(100, pagination.limit ?? 20));

    let sortedJobs = [...aggregationResult.jobs];

    if (filters.minSalary) {
      const min = filters.minSalary;
      sortedJobs = sortedJobs.filter(
        (job) => (job.salary?.min ?? 0) >= min || (job.salary?.max ?? 0) >= min
      );
    }

    const total = sortedJobs.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedData = sortedJobs.slice(startIndex, startIndex + limit);

    return {
      data: paginatedData,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getJobById(jobId: string): Promise<NormalizedJob | null> {
    const allProviders = this.providerRegistry.getEnabledProviders();
    for (const provider of allProviders) {
      try {
        const jobs = await provider.fetchJobs({});
        const found = jobs.find(
          (j) => j.id === jobId || j.providerJobId === jobId
        );
        if (found) {
          return found;
        }
      } catch {
        // Ignore provider fetch error during lookup
      }
    }
    return null;
  }

  async triggerBulkIngestion(
    options?: BulkIngestionOptions
  ): Promise<BulkIngestionSummary> {
    const filters: JobSearchFilters = {
      providers: options?.providers,
      allowedTiers: options?.allowedTiers,
    };

    const result = await this.aggregationService.aggregateJobs(filters);

    return {
      totalHarvested: result.totalFetched,
      totalUnique: result.jobs.length,
      totalDuplicates: result.duplicatesRemoved,
      providerBreakdown: result.providerStats,
    };
  }

  async getProviderHealth(): Promise<Record<string, ProviderHealth>> {
    const providers = this.providerRegistry.getAll();
    const healthMap: Record<string, ProviderHealth> = {};

    for (const provider of providers) {
      try {
        healthMap[provider.name] = await provider.healthCheck();
      } catch (err) {
        healthMap[provider.name] = {
          status: "UNREACHABLE" as any,
          lastCheckedAt: new Date().toISOString(),
          errorMessage: err instanceof Error ? err.message : String(err),
          consecutiveFailures: 1,
        };
      }
    }

    return healthMap;
  }
}
