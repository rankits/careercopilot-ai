import { BaseProviderClient } from '@/modules/jobs/providers/base/base.client.js';
import { RemoteOkJobPosting, RemoteOkResponse } from '@/modules/jobs/providers/remoteok/types.js';
import { ProviderFetchError } from '@/modules/jobs/errors/ProviderFetchError.js';

const DEFAULT_BASE_URL = 'https://remoteok.com/api';

export class RemoteOkClient extends BaseProviderClient {
  constructor(providerName: string, baseUrl = DEFAULT_BASE_URL, timeoutMs = 15000) {
    super({ providerName, baseUrl, timeoutMs, maxRetries: 3 });
  }

  async fetchJobs(): Promise<RemoteOkJobPosting[]> {
    return this.executeWithRetry(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 15000);

      try {
        const response = await fetch(this.options.baseUrl ?? DEFAULT_BASE_URL, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'CareerCopilot/1.0 (job-aggregation; +https://careercopilot.local)',
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new ProviderFetchError(
            this.options.providerName,
            `HTTP error ${response.status}: ${response.statusText}`,
          );
        }

        const data = (await response.json()) as RemoteOkResponse;
        // First element is a legal/meta notice — keep only real postings.
        return (Array.isArray(data) ? data : []).filter(
          (item) => item && (item.position || item.id) && !item.legal,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new ProviderFetchError(
          this.options.providerName,
          `Failed to fetch Remote OK jobs: ${message}`,
          error,
        );
      } finally {
        clearTimeout(timeout);
      }
    });
  }
}
