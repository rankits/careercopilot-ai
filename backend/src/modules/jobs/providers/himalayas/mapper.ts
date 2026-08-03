import { IJobMapper } from '@/modules/jobs/interfaces/IJobMapper.js';
import { NormalizedJob } from '@/modules/jobs/models/NormalizedJob.js';
import { ProviderTier } from '@/modules/jobs/types/job.types.js';
import { HimalayasJobPosting } from '@/modules/jobs/providers/himalayas/types.js';
import { generateCanonicalHash, normalizeText } from '@/modules/jobs/utils/fingerprint.js';
import {
  cleanOptionalString,
  cleanRequiredString,
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

export class HimalayasJobMapper implements IJobMapper<HimalayasJobPosting> {
  constructor(private readonly tier: ProviderTier = ProviderTier.PUBLIC) {}

  mapToNormalizedJob(raw: HimalayasJobPosting, providerName = 'himalayas'): NormalizedJob {
    const providerJobId = cleanRequiredString(raw.guid, 'guid');
    const title = cleanRequiredString(raw.title, 'title');
    const companyName = cleanRequiredString(raw.companyName, 'companyName');
    const applyUrl = cleanRequiredString(raw.applicationLink ?? raw.guid, 'applicationLink');
    const restrictions = raw.locationRestrictions ?? [];
    const locationRaw = restrictions.length > 0 ? restrictions.join(', ') : 'Remote Worldwide';
    const tags = uniqueTags(
      raw.categories,
      raw.parentCategories,
      asStringArray(raw.seniority),
      raw.employmentType ? [raw.employmentType] : undefined,
      raw.timezoneRestrictions,
    );
    const postedAt = toIsoDate(raw.pubDate) ?? new Date().toISOString();
    const salary =
      raw.minSalary || raw.maxSalary
        ? {
            min: raw.minSalary ?? undefined,
            max: raw.maxSalary ?? undefined,
            currency: cleanOptionalString(raw.currency) ?? 'USD',
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
        isRemote: true,
        country: restrictions[0],
      },
      description: stripHtml(raw.description ?? raw.excerpt) ?? '',
      applyUrl,
      salary,
      tags,
      postedAt,
      canonicalHash: generateCanonicalHash(companyName, title, locationRaw, true),
    };
  }

  mapMany(rawList: HimalayasJobPosting[], providerName = 'himalayas'): NormalizedJob[] {
    return rawList.map((raw) => this.mapToNormalizedJob(raw, providerName));
  }
}
