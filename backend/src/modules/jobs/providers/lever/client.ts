import { BaseProviderClient } from "../base/base.client.js";
import { LeverJobPosting } from "./types.js";
import { ProviderFetchError } from "../../errors/ProviderFetchError.js";

export class LeverClient extends BaseProviderClient {
  constructor(
    providerName: string,
    baseUrl = "https://api.lever.co/v0",
    timeoutMs = 8000
  ) {
    super({
      providerName,
      baseUrl,
      timeoutMs,
      maxRetries: 3,
    });
  }

  async fetchPostings(companyId: string): Promise<LeverJobPosting[]> {
    return this.executeWithRetry(async () => {
      const url = `${this.options.baseUrl}/postings/${encodeURIComponent(
        companyId
      )}?mode=json`;
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new ProviderFetchError(
          this.options.providerName,
          `HTTP error ${response.status}: ${response.statusText}`
        );
      }

      return (await response.json()) as LeverJobPosting[];
    });
  }
}
