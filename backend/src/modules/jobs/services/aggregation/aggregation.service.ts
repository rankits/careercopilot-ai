import { IJobProviderRegistry } from "../../registry/job-provider.registry.js";
import { DeduplicationEngine } from "./deduplication.engine.js";
import { JobSearchFilters } from "../../types/job.types.js";
import { NormalizedJob } from "../../models/NormalizedJob.js";

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

    const providerStats: Record<string, ProviderExecutionStats> = {};

    const fetchPromises = activeProviders.map(async (provider) => {
      const providerStartTime = Date.now();
      try {
        const jobs = await provider.fetchJobs(filters);
        const durationMs = Date.now() - providerStartTime;
        providerStats[provider.name] = {
          fetched: jobs.length,
          durationMs,
        };
        return jobs;
      } catch (error) {
        const durationMs = Date.now() - providerStartTime;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `[AggregationService] Provider '${provider.name}' failed after ${durationMs}ms:`,
          errorMessage
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

    return {
      jobs: uniqueJobs,
      totalFetched: rawJobs.length,
      duplicatesRemoved,
      providerStats,
    };
  }
}
