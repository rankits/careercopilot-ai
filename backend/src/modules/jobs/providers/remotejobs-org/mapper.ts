import { IJobMapper } from '@/modules/jobs/interfaces/IJobMapper.js';
import { NormalizedJob } from '@/modules/jobs/models/NormalizedJob.js';
import { JobSalaryPeriod, ProviderTier } from '@/modules/jobs/types/job.types.js';
import { RemoteJobsOrgPosting } from '@/modules/jobs/providers/remotejobs-org/types.js';
import { generateCanonicalHash, normalizeText } from '@/modules/jobs/utils/fingerprint.js';
import {
  cleanOptionalString,
  cleanRequiredString,
  isRemoteLocation,
  stripHtml,
  toIsoDate,
  uniqueTags,
} from '@/modules/jobs/utils/provider-mapping.js';

export class RemoteJobsOrgMapper implements IJobMapper<RemoteJobsOrgPosting> {
  constructor(private readonly tier: ProviderTier = ProviderTier.PUBLIC) {}

  mapToNormalizedJob(raw: RemoteJobsOrgPosting, providerName = 'remotejobs_org'): NormalizedJob {
    const providerJobId = cleanRequiredString(raw.id, 'id');
    const title = cleanRequiredString(raw.title, 'title');
    const companyName =
      typeof raw.company === 'string'
        ? cleanRequiredString(raw.company, 'company')
        : cleanRequiredString(raw.company?.name, 'company.name');
    const applyUrl = cleanRequiredString(raw.apply_url ?? raw.url ?? undefined, 'apply_url');
    const locationRaw = cleanOptionalString(raw.location) ?? 'Remote';
    const isRemote = isRemoteLocation(locationRaw) || /remote/i.test(locationRaw) || true;
    const postedAt = toIsoDate(raw.posted_at) ?? new Date().toISOString();
    const salary =
      raw.salary_min || raw.salary_max
        ? {
            min: raw.salary_min ?? undefined,
            max: raw.salary_max ?? undefined,
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
      location: { raw: locationRaw, isRemote: true },
      description: stripHtml(raw.description) ?? '',
      applyUrl,
      salary,
      tags: uniqueTags(
        raw.category ? [raw.category] : undefined,
        raw.type ? [raw.type] : undefined,
      ),
      postedAt,
      canonicalHash: generateCanonicalHash(companyName, title, locationRaw, isRemote),
    };
  }

  mapMany(rawList: RemoteJobsOrgPosting[], providerName = 'remotejobs_org'): NormalizedJob[] {
    return rawList.map((raw) => this.mapToNormalizedJob(raw, providerName));
  }
}
