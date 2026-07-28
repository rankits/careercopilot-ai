import { BaseProviderClient } from "../base/base.client.js";
import { GreenhouseJobPosting, GreenhouseBoardJobsResponse } from "./types.js";
import { ProviderFetchError } from "../../errors/ProviderFetchError.js";

export class GreenhouseClient extends BaseProviderClient {
  constructor(
    providerName: string,
    baseUrl = "https://boards-api.greenhouse.io/v1/boards",
    timeoutMs = 8000
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
      const url = `${this.options.baseUrl}/${encodeURIComponent(
        boardToken
      )}/jobs`;
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

      const data = (await response.json()) as GreenhouseBoardJobsResponse;
      return data.jobs || [];
    });
  }
}
