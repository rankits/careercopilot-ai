import { BaseProviderClient } from '@/modules/jobs/providers/base/base.client.js';
import {
  GreenhouseJobPosting,
  GreenhouseBoardJobsResponse,
} from '@/modules/jobs/providers/greenhouse/types.js';
import { ProviderFetchError } from '@/modules/jobs/errors/ProviderFetchError.js';

export class GreenhouseClient extends BaseProviderClient {
  constructor(
    providerName: string,
    baseUrl = 'https://boards-api.greenhouse.io/v1/boards',
    timeoutMs = 12000,
    private readonly includeContent = true,
  ) {
    super({
      providerName,
      baseUrl,
      timeoutMs,
      maxRetries: 3,
    });
  }

  async fetchBoardJobs(boardToken: string): Promise<GreenhouseJobPosting[]> {
    return this.executeWithRetry(async () => {
      const url = new URL(`${this.options.baseUrl}/${encodeURIComponent(boardToken)}/jobs`);
      if (this.includeContent) {
        url.searchParams.set('content', 'true');
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 12000);

      try {
        const response = await fetch(url.toString(), {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new ProviderFetchError(
            this.options.providerName,
            `HTTP error ${response.status}: ${response.statusText} (board=${boardToken})`,
          );
        }

        const data = (await response.json()) as GreenhouseBoardJobsResponse;
        return data.jobs || [];
      } finally {
        clearTimeout(timeout);
      }
    });
  }
}
