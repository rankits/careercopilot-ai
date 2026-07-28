import { IJobMapper } from "../../interfaces/IJobMapper.js";
import { NormalizedJob } from "../../models/NormalizedJob.js";
import { ProviderTier, JobSalaryPeriod } from "../../types/job.types.js";
import { LeverJobPosting } from "./types.js";
import {
  generateCanonicalHash,
  normalizeText,
} from "../../utils/fingerprint.js";

export class LeverJobMapper implements IJobMapper<LeverJobPosting> {
  constructor(
    private readonly companyName: string,
    private readonly tier: ProviderTier = ProviderTier.FREE_AUTH
  ) {}

  mapToNormalizedJob(
    raw: LeverJobPosting,
    providerName = "lever"
  ): NormalizedJob {
    const rawLocation = raw.categories.location || "Unspecified";
    const isRemote = rawLocation.toLowerCase().includes("remote");
    const city = rawLocation.split(",")[0]?.trim();

    const title = raw.text;
    const normalizedTitle = normalizeText(title);
    const normalizedCompany = normalizeText(this.companyName);

    const canonicalHash = generateCanonicalHash(
      this.companyName,
      title,
      city,
      isRemote
    );

    let period = JobSalaryPeriod.YEARLY;
    if (raw.salaryRange?.interval === "per-month-salary") {
      period = JobSalaryPeriod.MONTHLY;
    } else if (raw.salaryRange?.interval === "per-hour-salary") {
      period = JobSalaryPeriod.HOURLY;
    }

    const tags: string[] = [];
    if (raw.categories.team) tags.push(raw.categories.team);
    if (raw.categories.commitment) tags.push(raw.categories.commitment);
    if (isRemote) tags.push("remote");

    return {
      id: raw.id,
      providerJobId: raw.id,
      providerName,
      providerTier: this.tier,
      title,
      normalizedTitle,
      companyName: this.companyName,
      normalizedCompany,
      location: {
        raw: rawLocation,
        city,
        isRemote,
      },
      description: raw.descriptionPlain || "",
      applyUrl: raw.applyUrl || raw.hostedUrl,
      salary: raw.salaryRange
        ? {
            min: raw.salaryRange.min,
            max: raw.salaryRange.max,
            currency: raw.salaryRange.currency || "USD",
            period,
          }
        : undefined,
      tags,
      postedAt: new Date(raw.createdAt || Date.now()).toISOString(),
      canonicalHash,
    };
  }

  mapMany(rawList: LeverJobPosting[], providerName = "lever"): NormalizedJob[] {
    return rawList.map((item) => this.mapToNormalizedJob(item, providerName));
  }
}
