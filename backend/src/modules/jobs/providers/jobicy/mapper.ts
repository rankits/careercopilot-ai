import { IJobMapper } from '@/modules/jobs/interfaces/IJobMapper.js';
import { NormalizedJob } from '@/modules/jobs/models/NormalizedJob.js';
import { ProviderTier } from '@/modules/jobs/types/job.types.js';
import { JobicyJobPosting } from '@/modules/jobs/providers/jobicy/types.js';
import { generateCanonicalHash, normalizeText } from '@/modules/jobs/utils/fingerprint.js';
import {
  cleanOptionalString,
  cleanRequiredString,
  isRemoteLocation,
  mapSalaryPeriod,
  stripHtml,
  toIsoDate,
  uniqueTags,
} from '@/modules/jobs/utils/provider-mapping.js';

const asStringArray = (value: string[] | string | null | undefined): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  return [value];
};

export class JobicyJobMapper implements IJobMapper<JobicyJobPosting> {
  constructor(private readonly tier: ProviderTier = ProviderTier.PUBLIC) {}

  mapToNormalizedJob(raw: JobicyJobPosting, providerName = 'jobicy'): NormalizedJob {
    const providerJobId = cleanRequiredString(String(raw.id), 'id');
    const title = cleanRequiredString(raw.jobTitle, 'jobTitle');
    const companyName = cleanRequiredString(raw.companyName, 'companyName');
    const applyUrl = cleanRequiredString(raw.url, 'url');
    const locationRaw = cleanOptionalString(raw.jobGeo) ?? 'Remote';
    const isRemote = true;
    const tags = uniqueTags(
      asStringArray(raw.jobIndustry),
      asStringArray(raw.jobType),
      raw.jobLevel ? [raw.jobLevel] : undefined,
    );
    const postedAt = toIsoDate(raw.pubDate) ?? new Date().toISOString();

    const salary =
      raw.salaryMin || raw.salaryMax
        ? {
            min: raw.salaryMin ?? undefined,
            max: raw.salaryMax ?? undefined,
            currency: cleanOptionalString(raw.salaryCurrency) ?? 'USD',
            period: mapSalaryPeriod(raw.salaryPeriod),
          }
        : undefined;

    return {
      id: providerJobId,
      providerJobId,
      providerName,
      providerTier: this.tier,
      title,
      normalizedTitle: normalizeText(title),
      companyName,
      normalizedCompany: normalizeText(companyName),
      location: {
        raw: locationRaw,
        isRemote: isRemote || isRemoteLocation(locationRaw),
        country: locationRaw,
      },
      description: stripHtml(raw.jobDescription ?? raw.jobExcerpt) ?? '',
      applyUrl,
      salary,
      tags,
      postedAt,
      canonicalHash: generateCanonicalHash(companyName, title, locationRaw, true),
    };
  }

  mapMany(rawList: JobicyJobPosting[], providerName = 'jobicy'): NormalizedJob[] {
    return rawList.map((raw) => this.mapToNormalizedJob(raw, providerName));
  }
}
