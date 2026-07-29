import { IJobMapper } from "@/modules/jobs/interfaces/IJobMapper.js";
import { NormalizedJob } from "@/modules/jobs/models/NormalizedJob.js";
import { ProviderTier } from "@/modules/jobs/types/job.types.js";
import { ArbeitnowJobPosting } from "@/modules/jobs/providers/arbeitnow/types.js";
import {
  generateCanonicalHash,
  normalizeText,
} from "@/modules/jobs/utils/fingerprint.js";

const stripHtml = (value: string): string =>
  value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toIsoDate = (value: number | string | undefined): string => {
  if (typeof value === "number" && Number.isFinite(value)) {
    const epochMs = value > 1_000_000_000_000 ? value : value * 1000;
    return new Date(epochMs).toISOString();
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
};

const splitLocation = (
  location: string,
  remote?: boolean,
): NormalizedJob["location"] => {
  const trimmed = location.trim();
  const isRemote = remote === true || /remote/i.test(trimmed);

  if (!trimmed) {
    return {
      raw: isRemote ? "Remote" : "",
      isRemote,
    };
  }

  const [cityPart, countryPart] = trimmed.split(",").map((part) => part.trim());

  return {
    raw: trimmed,
    city: cityPart || undefined,
    country: countryPart || undefined,
    isRemote,
  };
};

export class ArbeitnowJobMapper implements IJobMapper<ArbeitnowJobPosting> {
  constructor(private readonly tier: ProviderTier = ProviderTier.PUBLIC) {}

  mapToNormalizedJob(
    raw: ArbeitnowJobPosting,
    providerName = "arbeitnow",
  ): NormalizedJob {
    const title = raw.title || "Untitled job";
    const companyName = raw.company_name || "Arbeitnow";
    const location = splitLocation(raw.location ?? "", raw.remote);
    const description = stripHtml(raw.description || "");
    const tags = Array.from(
      new Map(
        [...(raw.tags ?? []), ...(raw.job_types ?? [])]
          .map((tag) => tag.trim())
          .filter(Boolean)
          .map((tag) => [tag.toLowerCase(), tag] as const),
      ).values(),
    );

    return {
      id: raw.slug,
      providerJobId: raw.slug,
      providerName,
      providerTier: this.tier,
      title,
      normalizedTitle: normalizeText(title),
      companyName,
      normalizedCompany: normalizeText(companyName),
      location,
      description,
      applyUrl: raw.url,
      salary: undefined,
      tags: [...tags, location.isRemote ? "remote" : "onsite", "arbeitnow"],
      postedAt: toIsoDate(raw.created_at),
      canonicalHash: generateCanonicalHash(
        companyName,
        title,
        location.city ?? location.raw,
        location.isRemote,
      ),
    };
  }

  mapMany(
    rawList: ArbeitnowJobPosting[],
    providerName = "arbeitnow",
  ): NormalizedJob[] {
    return rawList.map((item) => this.mapToNormalizedJob(item, providerName));
  }
}
