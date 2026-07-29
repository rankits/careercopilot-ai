import { BaseProviderClient } from "@/modules/jobs/providers/base/base.client.js";
import {
  ArbeitnowJobPosting,
  ArbeitnowJobsResponse,
} from "@/modules/jobs/providers/arbeitnow/types.js";
import { ProviderFetchError } from "@/modules/jobs/errors/ProviderFetchError.js";

const DEFAULT_BASE_URL = "https://www.arbeitnow.com/api/job-board-api";

export class ArbeitnowClient extends BaseProviderClient {
  constructor(
    providerName: string,
    baseUrl = DEFAULT_BASE_URL,
    timeoutMs = 8000,
    private readonly maxPages = 3,
  ) {
    super({
      providerName,
      baseUrl,
      timeoutMs,
      maxRetries: 3,
    });
  }

  async fetchFeedJobs(): Promise<ArbeitnowJobPosting[]> {
    return this.executeWithRetry(async () => {
      const collected: ArbeitnowJobPosting[] = [];
      let nextUrl: string | null = this.buildPageUrl(1);

      for (let page = 1; nextUrl && page <= this.maxPages; page += 1) {
        const response = await this.fetchPage(nextUrl);
        collected.push(...(response.data ?? []));
        nextUrl = response.links?.next ?? null;
      }

      return collected;
    });
  }

  private buildPageUrl(page: number): string {
    const url = new URL(this.options.baseUrl ?? DEFAULT_BASE_URL);

    if (page > 1) {
      url.searchParams.set("page", String(page));
    }

    return url.toString();
  }

  private async fetchPage(url: string): Promise<ArbeitnowJobsResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 8000);

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new ProviderFetchError(
          this.options.providerName,
          `HTTP error ${response.status}: ${response.statusText}`,
        );
      }

      return (await response.json()) as ArbeitnowJobsResponse;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ProviderFetchError(
        this.options.providerName,
        `Failed to fetch Arbeitnow jobs: ${message}`,
        error,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
