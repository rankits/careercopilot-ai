import { BaseProviderClient } from '@/modules/jobs/providers/base/base.client.js';
import {
  HimalayasBrowseQuery,
  HimalayasSearchQuery,
} from '@/modules/jobs/providers/himalayas/config.js';
import {
  HimalayasJobPosting,
  HimalayasJobsResponse,
} from '@/modules/jobs/providers/himalayas/types.js';
import { ProviderFetchError } from '@/modules/jobs/errors/ProviderFetchError.js';

const DEFAULT_BROWSE_URL = 'https://himalayas.app/jobs/api';
const DEFAULT_SEARCH_URL = 'https://himalayas.app/jobs/api/search';

export class HimalayasClient extends BaseProviderClient {
  constructor(
    providerName: string,
    private readonly browseBaseUrl = DEFAULT_BROWSE_URL,
    private readonly searchBaseUrl = DEFAULT_SEARCH_URL,
    timeoutMs = 10000,
    private readonly browse: HimalayasBrowseQuery = { limit: 40, offset: 0 },
    private readonly searches: readonly HimalayasSearchQuery[] = [
      { q: 'engineer', country: 'India' },
      { q: 'software', country: 'US' },
      { country: 'India' },
    ],
  ) {
    super({ providerName, baseUrl: browseBaseUrl, timeoutMs, maxRetries: 3 });
  }

  async fetchJobs(): Promise<HimalayasJobPosting[]> {
    return this.executeWithRetry(async () => {
      const byGuid = new Map<string, HimalayasJobPosting>();

      const browseUrl = new URL(this.browseBaseUrl);
      browseUrl.searchParams.set('limit', String(this.browse.limit ?? 40));
      browseUrl.searchParams.set('offset', String(this.browse.offset ?? 0));
      const browseResponse = await this.fetchJson(browseUrl.toString());
      for (const job of browseResponse.jobs ?? []) {
        byGuid.set(job.guid, job);
      }

      for (const search of this.searches) {
        const url = new URL(this.searchBaseUrl);
        if (search.q) url.searchParams.set('q', search.q);
        if (search.country) url.searchParams.set('country', search.country);
        const response = await this.fetchJson(url.toString());
        for (const job of response.jobs ?? []) {
          byGuid.set(job.guid, job);
        }
      }

      return Array.from(byGuid.values());
    });
  }

  private async fetchJson(url: string): Promise<HimalayasJobsResponse> {
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
      return (await response.json()) as HimalayasJobsResponse;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ProviderFetchError(
        this.options.providerName,
        `Failed to fetch Himalayas jobs: ${message}`,
        error,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
