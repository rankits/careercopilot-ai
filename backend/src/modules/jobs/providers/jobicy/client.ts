import { BaseProviderClient } from '@/modules/jobs/providers/base/base.client.js';
import { JobicyFeedQuery } from '@/modules/jobs/providers/jobicy/config.js';
import { JobicyJobPosting, JobicyJobsResponse } from '@/modules/jobs/providers/jobicy/types.js';
import { ProviderFetchError } from '@/modules/jobs/errors/ProviderFetchError.js';

const DEFAULT_BASE_URL = 'https://jobicy.com/api/v2/remote-jobs';

const DEFAULT_FEEDS: readonly JobicyFeedQuery[] = [
  { count: 50, geo: 'apac' },
  { count: 50, geo: 'usa', industry: 'engineering' },
  { count: 30, tag: 'javascript' },
];

export class JobicyClient extends BaseProviderClient {
  constructor(
    providerName: string,
    baseUrl = DEFAULT_BASE_URL,
    timeoutMs = 10000,
    private readonly feeds: readonly JobicyFeedQuery[] = DEFAULT_FEEDS,
  ) {
    super({ providerName, baseUrl, timeoutMs, maxRetries: 3 });
  }

  async fetchJobs(): Promise<JobicyJobPosting[]> {
    return this.executeWithRetry(async () => {
      const byId = new Map<string, JobicyJobPosting>();

      for (const feed of this.feeds) {
        const url = new URL(this.options.baseUrl ?? DEFAULT_BASE_URL);
        if (feed.count) url.searchParams.set('count', String(feed.count));
        if (feed.geo) url.searchParams.set('geo', feed.geo);
        if (feed.industry) url.searchParams.set('industry', feed.industry);
        if (feed.tag) url.searchParams.set('tag', feed.tag);

        const response = await this.fetchJson(url.toString());
        for (const job of response.jobs ?? []) {
          byId.set(String(job.id), job);
        }
      }

      return Array.from(byId.values());
    });
  }

  private async fetchJson(url: string): Promise<JobicyJobsResponse> {
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
      return (await response.json()) as JobicyJobsResponse;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ProviderFetchError(
        this.options.providerName,
        `Failed to fetch Jobicy jobs: ${message}`,
        error,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
