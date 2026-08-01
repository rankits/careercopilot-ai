import { IJobMapper } from '@/modules/jobs/interfaces/IJobMapper.js';
import { NormalizedJob } from '@/modules/jobs/models/NormalizedJob.js';
import { JobSalaryPeriod, ProviderTier } from '@/modules/jobs/types/job.types.js';
import { RemoteOkJobPosting } from '@/modules/jobs/providers/remoteok/types.js';
import { generateCanonicalHash, normalizeText } from '@/modules/jobs/utils/fingerprint.js';
import {
  cleanOptionalString,
  cleanRequiredString,
  isRemoteLocation,
  stripHtml,
  toIsoDate,
  uniqueTags,
} from '@/modules/jobs/utils/provider-mapping.js';

export class RemoteOkJobMapper implements IJobMapper<RemoteOkJobPosting> {
  constructor(private readonly tier: ProviderTier = ProviderTier.PUBLIC) {}

  mapToNormalizedJob(raw: RemoteOkJobPosting, providerName = 'remoteok'): NormalizedJob {
    const providerJobId = cleanRequiredString(
      raw.id !== undefined ? String(raw.id) : raw.slug,
      'id',
    );
    const title = cleanRequiredString(raw.position, 'position');
    const companyName = cleanRequiredString(raw.company, 'company');
    const applyUrl = cleanRequiredString(raw.apply_url ?? raw.url, 'url');
    const locationRaw = cleanOptionalString(raw.location) ?? 'Remote';
    const isRemote = true;
    const postedAt = toIsoDate(raw.date ?? raw.epoch) ?? new Date().toISOString();
    const salary =
      raw.salary_min || raw.salary_max
        ? {
            min: raw.salary_min || undefined,
            max: raw.salary_max || undefined,
            currency: 'USD',
            period: JobSalaryPeriod.YEARLY,
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
      },
      description: stripHtml(raw.description) ?? '',
      applyUrl,
      salary,
      tags: uniqueTags(raw.tags),
      postedAt,
      canonicalHash: generateCanonicalHash(companyName, title, locationRaw, true),
    };
  }

  mapMany(rawList: RemoteOkJobPosting[], providerName = 'remoteok'): NormalizedJob[] {
    return rawList.map((raw) => this.mapToNormalizedJob(raw, providerName));
  }
}
