import { IJobContract } from "@/modules/jobs/contracts/IJobContract.js";
import {
  JobSearchFilters,
  PaginationOptions,
  PaginatedResult,
  BulkIngestionOptions,
  BulkIngestionSummary,
} from "@/modules/jobs/types/job.types.js";
import { ProviderHealth } from "@/modules/jobs/types/provider.types.js";
import { NormalizedJob } from "@/modules/jobs/models/NormalizedJob.js";
import { AggregationService } from "@/modules/jobs/services/aggregation/aggregation.service.js";
import { IJobProviderRegistry } from "@/modules/jobs/registry/job-provider.registry.js";
import { jobsLogger } from "@/shared/utils/logger.js";
import { IJobRepository } from "@/modules/jobs/interfaces/IJobRepository.js";

export class JobsService implements IJobContract {
  constructor(
    private readonly jobRepository: IJobRepository,
    private readonly aggregationService: AggregationService,
    private readonly providerRegistry: IJobProviderRegistry
  ) {}

  async searchJobs(
    filters: JobSearchFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<NormalizedJob>> {
    jobsLogger.info(
      {
        filters,
        pagination,
      },
      "Searching jobs",
    );
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

    jobsLogger.info(
      {
        total: total,
        page,
        limit,
        totalPages,
      },
      "Search jobs completed",
    );

    return {
      data: paginatedData,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getJobById(jobId: string): Promise<NormalizedJob | null> {
    jobsLogger.info({ jobId }, "Looking up job by ID");
    const allProviders = this.providerRegistry.getEnabledProviders();
    for (const provider of allProviders) {
      try {
        const jobs = await provider.fetchJobs({});
        const found = jobs.find(
          (j) => j.id === jobId || j.providerJobId === jobId
        );
        if (found) {
          jobsLogger.info(
            {
              jobId,
              provider: provider.name,
            },
            "Job found by provider lookup",
          );
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

    // Persist to database
    await this.jobRepository.upsertMany(result.jobs);

    jobsLogger.info(
      {
        filters,
        totalHarvested: result.totalFetched,
        totalUnique: result.jobs.length,
        totalDuplicates: result.duplicatesRemoved,
      },
      "Bulk ingestion summary generated",
    );

    return {
      totalHarvested: result.totalFetched,
      totalUnique: result.jobs.length,
      totalDuplicates: result.duplicatesRemoved,
      providerBreakdown: result.providerStats,
    };
  }

  async getProviderHealth(): Promise<Record<string, ProviderHealth>> {
    jobsLogger.info("Collecting provider health");
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

    jobsLogger.info(
      {
        providers: Object.keys(healthMap),
      },
      "Provider health collection completed",
    );

    return healthMap;
  }
}

