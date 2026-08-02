import { IJobMapper } from '@/modules/jobs/interfaces/IJobMapper.js';
import { NormalizedJob } from '@/modules/jobs/models/NormalizedJob.js';
import { ProviderTier } from '@/modules/jobs/types/job.types.js';
import { LeverJobPosting } from '@/modules/jobs/providers/lever/types.js';
import { generateCanonicalHash, normalizeText } from '@/modules/jobs/utils/fingerprint.js';
import {
  cleanOptionalString,
  cleanRequiredString,
  stripHtml,
  toIsoDate,
  uniqueTags,
} from '@/modules/jobs/utils/provider-mapping.js';

export class LeverJobMapper implements IJobMapper<LeverJobPosting> {
  constructor(
    private readonly companyName: string,
    private readonly tier: ProviderTier = ProviderTier.PUBLIC,
  ) {}

  mapToNormalizedJob(raw: LeverJobPosting, providerName = 'lever'): NormalizedJob {
    const providerJobId = cleanRequiredString(raw.id, 'id');
    const title = cleanRequiredString(raw.text, 'text');
    const companyName = cleanRequiredString(this.companyName, 'companyName');
    const applyUrl = cleanRequiredString(raw.hostedUrl ?? raw.applyUrl ?? undefined, 'hostedUrl');
    const locationRaw =
      cleanOptionalString(raw.categories?.location) ??
      cleanOptionalString(raw.categories?.allLocations?.[0]) ??
      cleanOptionalString(raw.country) ??
      '';
    const isRemote = /\bremote\b/i.test(raw.workplaceType ?? '') || /\bremote\b/i.test(locationRaw);
    const tags = uniqueTags(
      raw.categories?.department ? [raw.categories.department] : undefined,
      raw.categories?.team ? [raw.categories.team] : undefined,
      raw.categories?.commitment ? [raw.categories.commitment] : undefined,
      raw.workplaceType ? [raw.workplaceType] : undefined,
    );
    const postedAt = toIsoDate(raw.createdAt) ?? new Date().toISOString();

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
        country: cleanOptionalString(raw.country),
        isRemote,
      },
      description: stripHtml(raw.descriptionBody ?? raw.description ?? raw.descriptionPlain) ?? '',
      applyUrl,
      tags,
      postedAt,
      canonicalHash: generateCanonicalHash(companyName, title, locationRaw, isRemote),
    };
  }

  mapMany(rawList: LeverJobPosting[], providerName = 'lever'): NormalizedJob[] {
    return rawList.map((raw) => this.mapToNormalizedJob(raw, providerName));
  }
}
