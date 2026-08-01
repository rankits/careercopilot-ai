import { BaseProviderClient } from '@/modules/jobs/providers/base/base.client.js';
import { LeverJobPosting, LeverPostingsResponse } from '@/modules/jobs/providers/lever/types.js';
import { ProviderFetchError } from '@/modules/jobs/errors/ProviderFetchError.js';

const US_BASE = 'https://api.lever.co/v0/postings';
const EU_BASE = 'https://api.eu.lever.co/v0/postings';

export class LeverClient extends BaseProviderClient {
  constructor(providerName: string, timeoutMs = 15000) {
    super({ providerName, baseUrl: US_BASE, timeoutMs, maxRetries: 3 });
  }

  async fetchSiteJobs(site: string, eu = false): Promise<LeverJobPosting[]> {
    return this.executeWithRetry(async () => {
      const base = eu ? EU_BASE : US_BASE;
      const url = new URL(`${base}/${encodeURIComponent(site)}`);
      url.searchParams.set('mode', 'json');

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 15000);

      try {
        const response = await fetch(url.toString(), {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new ProviderFetchError(
            this.options.providerName,
            `HTTP error ${response.status}: ${response.statusText} (site=${site})`,
          );
        }
        const data = (await response.json()) as LeverPostingsResponse;
        return Array.isArray(data) ? data : [];
      } finally {
        clearTimeout(timeout);
      }
    });
  }
}
