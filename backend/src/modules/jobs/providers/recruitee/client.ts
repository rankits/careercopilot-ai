import { BaseProviderClient } from '@/modules/jobs/providers/base/base.client.js';
import {
  RecruiteeOffer,
  RecruiteeOffersResponse,
} from '@/modules/jobs/providers/recruitee/types.js';
import { ProviderFetchError } from '@/modules/jobs/errors/ProviderFetchError.js';

export class RecruiteeClient extends BaseProviderClient {
  constructor(providerName: string, timeoutMs = 12000) {
    super({
      providerName,
      baseUrl: 'https://recruitee.com',
      timeoutMs,
      maxRetries: 3,
    });
  }

  async fetchCompanyOffers(subdomain: string): Promise<RecruiteeOffer[]> {
    return this.executeWithRetry(async () => {
      const url = `https://${encodeURIComponent(subdomain)}.recruitee.com/api/offers/`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 12000);

      try {
        const response = await fetch(url, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new ProviderFetchError(
            this.options.providerName,
            `HTTP error ${response.status}: ${response.statusText} (company=${subdomain})`,
          );
        }
        const data = (await response.json()) as RecruiteeOffersResponse;
        return data.offers ?? [];
      } finally {
        clearTimeout(timeout);
      }
    });
  }
}
