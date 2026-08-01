import { IJobProvider } from '@/modules/jobs/interfaces/IJobProvider.js';
import { ProviderTier, JobSearchFilters } from '@/modules/jobs/types/job.types.js';
import { ProviderHealth, ProviderRateLimitStatus } from '@/modules/jobs/types/provider.types.js';
import { NormalizedJob } from '@/modules/jobs/models/NormalizedJob.js';
import { AshbyBoardConfig, AshbyProviderConfig } from '@/modules/jobs/providers/ashby/config.js';
import { AshbyClient } from '@/modules/jobs/providers/ashby/client.js';
import { AshbyJobMapper } from '@/modules/jobs/providers/ashby/mapper.js';
import { applyJobSearchFilters } from '@/modules/jobs/utils/provider-mapping.js';
import { jobsLogger } from '@/shared/utils/logger.js';

const DEFAULT_BOARDS: readonly AshbyBoardConfig[] = [
  { boardName: 'notion', companyName: 'Notion' },
  { boardName: 'openai', companyName: 'OpenAI' },
  { boardName: 'ramp', companyName: 'Ramp' },
  { boardName: 'linear', companyName: 'Linear' },
];

export class AshbyJobProvider implements IJobProvider {
  readonly name = 'ashby';
  readonly tier: ProviderTier;
  readonly isEnabled = true;

  private readonly client: AshbyClient;
  private readonly boards: readonly AshbyBoardConfig[];

  constructor(private readonly config: AshbyProviderConfig = {}) {
    this.tier = config.tier ?? ProviderTier.PUBLIC;
    this.client = new AshbyClient(this.name, config.timeoutMs, config.includeCompensation ?? true);
    this.boards = config.boards && config.boards.length > 0 ? config.boards : DEFAULT_BOARDS;
  }

  async fetchJobs(filters: JobSearchFilters): Promise<NormalizedJob[]> {
    jobsLogger.debug(
      { provider: this.name, boards: this.boards.map((b) => b.boardName), filters },
      'Ashby provider fetch started',
    );

    const settled = await Promise.allSettled(
      this.boards.map(async (board) => {
        const raw = await this.client.fetchBoardJobs(board.boardName);
        const mapper = new AshbyJobMapper(board.companyName || board.boardName, this.tier);
        return mapper.mapMany(raw, this.name);
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
            board: this.boards[index]?.boardName,
            error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          },
          'Ashby board fetch failed',
        );
      }
    }

    const filtered = applyJobSearchFilters(normalized, filters);
    jobsLogger.debug(
      { provider: this.name, fetched: filtered.length },
      'Ashby provider fetch completed',
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
