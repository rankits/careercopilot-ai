import { BaseProviderClient } from '@/modules/jobs/providers/base/base.client.js';
import { RemoteJobsOrgFeedQuery } from '@/modules/jobs/providers/remotejobs-org/config.js';
import {
  RemoteJobsOrgPosting,
  RemoteJobsOrgResponse,
} from '@/modules/jobs/providers/remotejobs-org/types.js';
import { ProviderFetchError } from '@/modules/jobs/errors/ProviderFetchError.js';

const DEFAULT_BASE_URL = 'https://remotejobs.org/api/v1/jobs';

const DEFAULT_FEEDS: readonly RemoteJobsOrgFeedQuery[] = [
  { category: 'programming', limit: 50 },
  { category: 'design', limit: 30 },
  { limit: 40 },
];

export class RemoteJobsOrgClient extends BaseProviderClient {
  constructor(
    providerName: string,
    baseUrl = DEFAULT_BASE_URL,
    timeoutMs = 10000,
    private readonly feeds: readonly RemoteJobsOrgFeedQuery[] = DEFAULT_FEEDS,
  ) {
    super({ providerName, baseUrl, timeoutMs, maxRetries: 3 });
  }

  async fetchJobs(): Promise<RemoteJobsOrgPosting[]> {
    return this.executeWithRetry(async () => {
      const byId = new Map<string, RemoteJobsOrgPosting>();

      for (const feed of this.feeds) {
        const url = new URL(this.options.baseUrl ?? DEFAULT_BASE_URL);
        if (feed.category) url.searchParams.set('category', feed.category);
        if (feed.limit) url.searchParams.set('limit', String(feed.limit));
        if (feed.location) url.searchParams.set('location', feed.location);

        const response = await this.fetchJson(url.toString());
        for (const job of response.data ?? []) {
          byId.set(job.id, job);
        }
      }

      return Array.from(byId.values());
    });
  }

  private async fetchJson(url: string): Promise<RemoteJobsOrgResponse> {
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
      return (await response.json()) as RemoteJobsOrgResponse;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ProviderFetchError(
        this.options.providerName,
        `Failed to fetch RemoteJobs.org jobs: ${message}`,
        error,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
