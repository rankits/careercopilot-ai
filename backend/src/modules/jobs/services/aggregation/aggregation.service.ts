import { IJobProviderRegistry } from "@/modules/jobs/registry/job-provider.registry.js";
import { DeduplicationEngine } from "@/modules/jobs/services/aggregation/deduplication.engine.js";
import { JobSearchFilters } from "@/modules/jobs/types/job.types.js";
import { NormalizedJob } from "@/modules/jobs/models/NormalizedJob.js";
import { jobsLogger } from "@/shared/utils/logger.js";

export interface ProviderExecutionStats {
  readonly fetched: number;
  readonly durationMs: number;
  readonly error?: string;
}

export interface AggregationResult {
  readonly jobs: NormalizedJob[];
  readonly totalFetched: number;
  readonly duplicatesRemoved: number;
  readonly providerStats: Record<string, ProviderExecutionStats>;
}

export class AggregationService {
  constructor(
    private readonly registry: IJobProviderRegistry,
    private readonly dedupEngine: DeduplicationEngine
  ) {}

  async aggregateJobs(filters: JobSearchFilters): Promise<AggregationResult> {
    const activeProviders = this.registry.getEnabledProviders({
      tiers: filters.allowedTiers,
      names: filters.providers,
    });

    jobsLogger.info(
      {
        filters,
        activeProviders: activeProviders.map((provider) => provider.name),
      },
      "Starting job aggregation",
    );

    const providerStats: Record<string, ProviderExecutionStats> = {};

    const fetchPromises = activeProviders.map(async (provider) => {
      const providerStartTime = Date.now();
      try {
        jobsLogger.debug(
          {
            provider: provider.name,
            tier: provider.tier,
          },
          "Fetching jobs from provider",
        );
        const jobs = await provider.fetchJobs(filters);
        const durationMs = Date.now() - providerStartTime;
        providerStats[provider.name] = {
          fetched: jobs.length,
          durationMs,
        };
        jobsLogger.info(
          {
            provider: provider.name,
            fetched: jobs.length,
            durationMs,
          },
          "Provider fetch completed",
        );
        return jobs;
      } catch (error) {
        const durationMs = Date.now() - providerStartTime;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        jobsLogger.error(
          {
            provider: provider.name,
            durationMs,
            error: errorMessage,
          },
          "Provider fetch failed",
        );
        providerStats[provider.name] = {
          fetched: 0,
          durationMs,
          error: errorMessage,
        };
        throw error;
      }
    });

    const settledResults = await Promise.allSettled(fetchPromises);

    const rawJobs: NormalizedJob[] = [];

    for (const result of settledResults) {
      if (result.status === "fulfilled") {
        rawJobs.push(...result.value);
      }
    }

    const { uniqueJobs, duplicatesRemoved } =
      this.dedupEngine.deduplicate(rawJobs);

    jobsLogger.info(
      {
        totalFetched: rawJobs.length,
        totalUnique: uniqueJobs.length,
        duplicatesRemoved,
      },
      "Job aggregation completed",
    );

    return {
      jobs: uniqueJobs,
      totalFetched: rawJobs.length,
      duplicatesRemoved,
      providerStats,
    };
  }
}

