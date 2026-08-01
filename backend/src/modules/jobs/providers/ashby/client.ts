import { BaseProviderClient } from '@/modules/jobs/providers/base/base.client.js';
import { AshbyJobPosting, AshbyJobsResponse } from '@/modules/jobs/providers/ashby/types.js';
import { ProviderFetchError } from '@/modules/jobs/errors/ProviderFetchError.js';

const DEFAULT_BASE = 'https://api.ashbyhq.com/posting-api/job-board';

export class AshbyClient extends BaseProviderClient {
  constructor(
    providerName: string,
    timeoutMs = 20000,
    private readonly includeCompensation = true,
  ) {
    super({ providerName, baseUrl: DEFAULT_BASE, timeoutMs, maxRetries: 3 });
  }

  async fetchBoardJobs(boardName: string): Promise<AshbyJobPosting[]> {
    return this.executeWithRetry(async () => {
      const url = new URL(`${DEFAULT_BASE}/${encodeURIComponent(boardName)}`);
      if (this.includeCompensation) {
        url.searchParams.set('includeCompensation', 'true');
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 20000);

      try {
        const response = await fetch(url.toString(), {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new ProviderFetchError(
            this.options.providerName,
            `HTTP error ${response.status}: ${response.statusText} (board=${boardName})`,
          );
        }
        const data = (await response.json()) as AshbyJobsResponse;
        return (data.jobs ?? []).filter((job) => job.isListed !== false);
      } finally {
        clearTimeout(timeout);
      }
    });
  }
}
