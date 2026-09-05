import { IJobProvider } from '@/modules/jobs/interfaces/IJobProvider.js';
import { ProviderTier, JobSearchFilters } from '@/modules/jobs/types/job.types.js';
import { ProviderHealth, ProviderRateLimitStatus } from '@/modules/jobs/types/provider.types.js';
import { NormalizedJob } from '@/modules/jobs/models/NormalizedJob.js';
import {
  GreenhouseBoardConfig,
  GreenhouseProviderConfig,
} from '@/modules/jobs/providers/greenhouse/config.js';
import { GreenhouseClient } from '@/modules/jobs/providers/greenhouse/client.js';
import { GreenhouseJobMapper } from '@/modules/jobs/providers/greenhouse/mapper.js';
import { applyJobSearchFilters } from '@/modules/jobs/utils/provider-mapping.js';
import { jobsLogger } from '@/shared/utils/logger.js';

export class GreenhouseJobProvider implements IJobProvider {
  readonly name = 'greenhouse';
  readonly tier: ProviderTier;
  readonly isEnabled = true;

  private readonly client: GreenhouseClient;
  private readonly boards: readonly GreenhouseBoardConfig[];

  constructor(private readonly config: GreenhouseProviderConfig) {
    this.tier = config.tier ?? ProviderTier.PUBLIC;
    this.client = new GreenhouseClient(
      this.name,
      config.baseUrl,
      config.timeoutMs,
      config.includeContent ?? true,
    );

    if (config.boards && config.boards.length > 0) {
      this.boards = config.boards;
    } else if (config.boardToken) {
      this.boards = [
        {
          boardToken: config.boardToken,
          companyName: config.companyName || config.boardToken,
        },
      ];
    } else {
      throw new Error('GreenhouseJobProvider requires boards[] or boardToken');
    }
  }

  async fetchJobs(filters: JobSearchFilters): Promise<NormalizedJob[]> {
    jobsLogger.debug(
      {
        provider: this.name,
        boards: this.boards.map((board) => board.boardToken),
        filters,
      },
      'Greenhouse provider fetch started',
    );

    const settled = await Promise.allSettled(
      this.boards.map(async (board) => {
        const rawPostings = await this.client.fetchBoardJobs(board.boardToken);
        const mapper = new GreenhouseJobMapper(board.companyName || board.boardToken, this.tier);
        return mapper.mapMany(rawPostings, this.name);
      }),
    );

    const normalized: NormalizedJob[] = [];
    for (const [index, result] of settled.entries()) {
      if (result.status === 'fulfilled') {
        normalized.push(...result.value);
      } else {
        jobsLogger.warn(
          {
            provider: this.name,
            boardToken: this.boards[index]?.boardToken,
            error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          },
          'Greenhouse board fetch failed',
        );
      }
    }

    const filtered = applyJobSearchFilters(normalized, filters);
    jobsLogger.debug(
      { provider: this.name, fetched: filtered.length },
      'Greenhouse provider fetch completed',
    );
    return filtered;
  }

  async healthCheck(): Promise<ProviderHealth> {
    return this.client.healthCheck();
  }

  getRateLimitStatus(): ProviderRateLimitStatus {
    return this.client.getRateLimitStatus();
  }
}
