import { IJobProvider } from "@/modules/jobs/interfaces/IJobProvider.js";
import {
  ProviderTier,
  JobSearchFilters,
  JobSalaryPeriod,
} from "@/modules/jobs/types/job.types.js";
import {
  ProviderHealth,
  ProviderHealthStatus,
  ProviderRateLimitStatus,
} from "@/modules/jobs/types/provider.types.js";
import { NormalizedJob } from "@/modules/jobs/models/NormalizedJob.js";
import {
  generateCanonicalHash,
  normalizeText,
} from "@/modules/jobs/utils/fingerprint.js";
import { jobsLogger } from "@/shared/utils/logger.js";

export interface PublicFeedJobPosting {
  readonly id: string;
  readonly title: string;
  readonly company: string;
  readonly location: string;
  readonly description: string;
  readonly url: string;
  readonly date: string;
  readonly remote?: boolean;
}

export class OpenPublicFeedProvider implements IJobProvider {
  readonly name = "public-feed";
  readonly tier = ProviderTier.PUBLIC;
  readonly isEnabled = true;

  constructor(
    private readonly feedUrl = "https://example.com/api/jobs/public.json"
  ) {}

  async fetchJobs(filters: JobSearchFilters): Promise<NormalizedJob[]> {
    jobsLogger.debug(
      {
        provider: this.name,
        feedUrl: this.feedUrl,
        filters,
      },
      "Public feed provider fetch started",
    );
    const samplePostings: PublicFeedJobPosting[] = [
      {
        id: "pub-1001",
        title: "Senior Backend Engineer",
        company: "OpenSource Inc",
        location: "Remote, Worldwide",
        description:
          "Join our public open-source backend team working on Node.js and TypeScript.",
        url: "https://example.com/jobs/pub-1001",
        date: new Date().toISOString(),
        remote: true,
      },
      {
        id: "pub-1002",
        title: "Full Stack TypeScript Developer",
        company: "TechPulse Labs",
        location: "New York, USA",
        description:
          "Building modern full-stack web applications with React and NestJS.",
        url: "https://example.com/jobs/pub-1002",
        date: new Date().toISOString(),
        remote: false,
      },
    ];

    let normalized = samplePostings.map((item) => {
      const isRemote =
        item.remote ?? item.location.toLowerCase().includes("remote");
      const city = item.location.split(",")[0]?.trim();
      return {
        id: item.id,
        providerJobId: item.id,
        providerName: this.name,
        providerTier: this.tier,
        title: item.title,
        normalizedTitle: normalizeText(item.title),
        companyName: item.company,
        normalizedCompany: normalizeText(item.company),
        location: {
          raw: item.location,
          city,
          isRemote,
        },
        description: item.description,
        applyUrl: item.url,
        salary: {
          min: 120000,
          max: 160000,
          currency: "USD",
          period: JobSalaryPeriod.YEARLY,
        },
        tags: [isRemote ? "remote" : "onsite", "public"],
        postedAt: item.date,
        canonicalHash: generateCanonicalHash(
          item.company,
          item.title,
          city,
          isRemote
        ),
      };
    });

    if (filters.query) {
      const q = filters.query.toLowerCase();
      normalized = normalized.filter(
        (job) =>
          job.title.toLowerCase().includes(q) ||
          job.description.toLowerCase().includes(q)
      );
    }

    if (filters.location) {
      const loc = filters.location.toLowerCase();
      normalized = normalized.filter((job) =>
        job.location.raw.toLowerCase().includes(loc)
      );
    }

    if (filters.isRemote !== undefined) {
      normalized = normalized.filter(
        (job) => job.location.isRemote === filters.isRemote
      );
    }

    jobsLogger.debug(
      {
        provider: this.name,
        fetched: normalized.length,
      },
      "Public feed provider fetch completed",
    );

    return normalized;
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      status: ProviderHealthStatus.HEALTHY,
      lastCheckedAt: new Date().toISOString(),
      latencyMs: 15,
      consecutiveFailures: 0,
    };
  }

  getRateLimitStatus(): ProviderRateLimitStatus {
    return {
      remaining: 9999,
      limit: 10000,
    };
  }
}

