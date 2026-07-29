import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpenPublicFeedProvider } from "@/modules/jobs/providers/public-feed/public-feed.provider.js";

const createResponse = (data: unknown, ok = true) =>
  ({
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? "OK" : "Internal Server Error",
    json: async () => data,
  }) as Response;

describe("OpenPublicFeedProvider", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps Arbeitnow API jobs into normalized jobs", async () => {
    fetchMock.mockResolvedValueOnce(
      createResponse({
        data: [
          {
            slug: "senior-net-c-developer-all-genders-berlin-147497",
            company_name: "Vexcash AG",
            title: "Senior .NET / C# Developer (all genders)",
            description: "<p>Build and maintain modern backend services.</p>",
            remote: false,
            url: "https://www.arbeitnow.com/jobs/companies/vexcash-ag/senior-net-c-developer-all-genders-berlin-147497",
            tags: ["Private Banking"],
            job_types: ["professional / experienced"],
            location: "Berlin",
            created_at: 1_785_321_027,
          },
        ],
        links: { next: null },
      }),
    );

    const provider = new OpenPublicFeedProvider({ maxPages: 1 });
    const jobs = await provider.fetchJobs({ query: "developer", location: "Berlin" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      id: "senior-net-c-developer-all-genders-berlin-147497",
      providerName: "arbeitnow",
      title: "Senior .NET / C# Developer (all genders)",
      companyName: "Vexcash AG",
      location: {
        raw: "Berlin",
        city: "Berlin",
        isRemote: false,
      },
      description: "Build and maintain modern backend services.",
      applyUrl: "https://www.arbeitnow.com/jobs/companies/vexcash-ag/senior-net-c-developer-all-genders-berlin-147497",
      tags: ["Private Banking", "professional / experienced", "onsite", "arbeitnow"],
    });
    expect(jobs[0].postedAt).toBe("2026-07-29T10:30:27.000Z");
    expect(jobs[0].canonicalHash).toHaveLength(64);
  });

  it("reports health as healthy when the API responds", async () => {
    const provider = new OpenPublicFeedProvider({ maxPages: 1 });
    const health = await provider.healthCheck();

    expect(health.status).toBe("HEALTHY");
    expect(health.consecutiveFailures).toBe(0);
  });
});
