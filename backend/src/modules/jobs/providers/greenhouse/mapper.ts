import { IJobMapper } from "@/modules/jobs/interfaces/IJobMapper.js";
import { NormalizedJob } from "@/modules/jobs/models/NormalizedJob.js";
import { ProviderTier } from "@/modules/jobs/types/job.types.js";
import { GreenhouseJobPosting } from "@/modules/jobs/providers/greenhouse/types.js";
import {
  generateCanonicalHash,
  normalizeText,
} from "@/modules/jobs/utils/fingerprint.js";

export class GreenhouseJobMapper implements IJobMapper<GreenhouseJobPosting> {
  constructor(
    private readonly defaultCompanyName: string,
    private readonly tier: ProviderTier = ProviderTier.PUBLIC
  ) {}

  mapToNormalizedJob(
    raw: GreenhouseJobPosting,
    providerName = "greenhouse"
  ): NormalizedJob {
    const rawLocation = raw.location?.name || "Unspecified";
    const isRemote = rawLocation.toLowerCase().includes("remote");
    const city = rawLocation.split(";")[0]?.split(",")[0]?.trim();

    const companyName = raw.company_name || this.defaultCompanyName;
    const title = raw.title;
    const normalizedTitle = normalizeText(title);
    const normalizedCompany = normalizeText(companyName);

    const canonicalHash = generateCanonicalHash(
      companyName,
      title,
      city,
      isRemote
    );

    const tags: string[] = ["greenhouse"];
    if (isRemote) {
      tags.push("remote");
    } else {
      tags.push("onsite");
    }

    const postedAt =
      raw.first_published || raw.updated_at || new Date().toISOString();

    return {
      id: String(raw.id),
      providerJobId: String(raw.id),
      providerName,
      providerTier: this.tier,
      title,
      normalizedTitle,
      companyName,
      normalizedCompany,
      location: {
        raw: rawLocation,
        city,
        isRemote,
      },
      description:
        raw.content || "See job link for full job description and requirements.",
      applyUrl: raw.absolute_url,
      salary: undefined,
      tags,
      postedAt: new Date(postedAt).toISOString(),
      canonicalHash,
    };
  }

  mapMany(
    rawList: GreenhouseJobPosting[],
    providerName = "greenhouse"
  ): NormalizedJob[] {
    return rawList.map((item) => this.mapToNormalizedJob(item, providerName));
  }
}

