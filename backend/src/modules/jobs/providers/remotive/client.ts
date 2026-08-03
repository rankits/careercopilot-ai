import { BaseProviderClient } from '@/modules/jobs/providers/base/base.client.js';
import {
  RemotiveJobPosting,
  RemotiveJobsResponse,
} from '@/modules/jobs/providers/remotive/types.js';
import { ProviderFetchError } from '@/modules/jobs/errors/ProviderFetchError.js';

const DEFAULT_BASE_URL = 'https://remotive.com/api/remote-jobs';

export class RemotiveClient extends BaseProviderClient {
  constructor(
    providerName: string,
    baseUrl = DEFAULT_BASE_URL,
    timeoutMs = 10000,
    private readonly searches: readonly string[] = ['software', 'India', 'engineer'],
  ) {
    super({
      providerName,
      baseUrl,
      timeoutMs,
      maxRetries: 3,
    });
  }

  async fetchJobs(): Promise<RemotiveJobPosting[]> {
    return this.executeWithRetry(async () => {
      const byId = new Map<string, RemotiveJobPosting>();

      for (const search of this.searches) {
        const url = new URL(this.options.baseUrl ?? DEFAULT_BASE_URL);
        if (search.trim()) {
          url.searchParams.set('search', search.trim());
        }

        const response = await this.fetchJson(url.toString());
        for (const job of response.jobs ?? []) {
          byId.set(String(job.id), job);
        }
      }

      return Array.from(byId.values());
    });
  }

  private async fetchJson(url: string): Promise<RemotiveJobsResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 10000);

    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new ProviderFetchError(
          this.options.providerName,
          `HTTP error ${response.status}: ${response.statusText}`,
        );
      }

      return (await response.json()) as RemotiveJobsResponse;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ProviderFetchError(
        this.options.providerName,
        `Failed to fetch Remotive jobs: ${message}`,
        error,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
