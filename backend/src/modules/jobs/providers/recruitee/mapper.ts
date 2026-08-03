import { IJobMapper } from '@/modules/jobs/interfaces/IJobMapper.js';
import { NormalizedJob } from '@/modules/jobs/models/NormalizedJob.js';
import { ProviderTier } from '@/modules/jobs/types/job.types.js';
import { RecruiteeOffer } from '@/modules/jobs/providers/recruitee/types.js';
import { generateCanonicalHash, normalizeText } from '@/modules/jobs/utils/fingerprint.js';
import {
  cleanOptionalString,
  cleanRequiredString,
  mapSalaryPeriod,
  stripHtml,
  toIsoDate,
  uniqueTags,
} from '@/modules/jobs/utils/provider-mapping.js';

export class RecruiteeJobMapper implements IJobMapper<RecruiteeOffer> {
  constructor(
    private readonly fallbackCompanyName: string,
    private readonly tier: ProviderTier = ProviderTier.PUBLIC,
  ) {}

  mapToNormalizedJob(raw: RecruiteeOffer, providerName = 'recruitee'): NormalizedJob {
    const providerJobId = cleanRequiredString(String(raw.id), 'id');
    const title = cleanRequiredString(raw.title ?? raw.position ?? undefined, 'title');
    const companyName = cleanRequiredString(
      raw.company_name ?? this.fallbackCompanyName,
      'company_name',
    );
    const applyUrl = cleanRequiredString(
      raw.careers_apply_url ?? raw.careers_url ?? undefined,
      'careers_apply_url',
    );
    const locationRaw =
      cleanOptionalString(raw.location) ?? [raw.city, raw.country].filter(Boolean).join(', ') ?? '';
    const isRemote = raw.remote === true || /\bremote\b/i.test(locationRaw);
    const postedAt =
      toIsoDate(raw.published_at ?? raw.created_at ?? raw.updated_at) ?? new Date().toISOString();
    const salary =
      raw.salary?.min || raw.salary?.max
        ? {
            min: raw.salary.min ?? undefined,
            max: raw.salary.max ?? undefined,
            currency: cleanOptionalString(raw.salary.currency) ?? 'USD',
            period: mapSalaryPeriod(raw.salary.period),
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
        city: cleanOptionalString(raw.city),
        country: cleanOptionalString(raw.country_code ?? raw.country),
        isRemote,
      },
      description: stripHtml([raw.description, raw.requirements].filter(Boolean).join('\n')) ?? '',
      applyUrl,
      salary,
      tags: uniqueTags(raw.tags, raw.department ? [raw.department] : undefined),
      postedAt,
      canonicalHash: generateCanonicalHash(companyName, title, locationRaw, isRemote),
    };
  }

  mapMany(rawList: RecruiteeOffer[], providerName = 'recruitee'): NormalizedJob[] {
    return rawList.map((raw) => this.mapToNormalizedJob(raw, providerName));
  }
}
