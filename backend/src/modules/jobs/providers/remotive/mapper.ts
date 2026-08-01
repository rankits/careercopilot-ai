import { IJobMapper } from '@/modules/jobs/interfaces/IJobMapper.js';
import { NormalizedJob } from '@/modules/jobs/models/NormalizedJob.js';
import { ProviderTier } from '@/modules/jobs/types/job.types.js';
import { RemotiveJobPosting } from '@/modules/jobs/providers/remotive/types.js';
import { generateCanonicalHash, normalizeText } from '@/modules/jobs/utils/fingerprint.js';
import {
  cleanOptionalString,
  cleanRequiredString,
  stripHtml,
  toIsoDate,
  uniqueTags,
} from '@/modules/jobs/utils/provider-mapping.js';

export class RemotiveJobMapper implements IJobMapper<RemotiveJobPosting> {
  constructor(private readonly tier: ProviderTier = ProviderTier.PUBLIC) {}

  mapToNormalizedJob(raw: RemotiveJobPosting, providerName = 'remotive'): NormalizedJob {
    const providerJobId = cleanRequiredString(String(raw.id), 'id');
    const title = cleanRequiredString(raw.title, 'title');
    const companyName = cleanRequiredString(raw.company_name, 'company_name');
    const applyUrl = cleanRequiredString(raw.url, 'url');
    const locationRaw = cleanOptionalString(raw.candidate_required_location) ?? 'Remote';
    const isRemote = true;
    const tags = uniqueTags(
      raw.tags ?? undefined,
      raw.category ? [raw.category] : undefined,
      raw.job_type ? [raw.job_type] : undefined,
    );
    const postedAt = toIsoDate(raw.publication_date) ?? new Date().toISOString();

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
        isRemote,
      },
      description: stripHtml(raw.description) ?? '',
      applyUrl,
      tags,
      postedAt,
      canonicalHash: generateCanonicalHash(companyName, title, locationRaw, isRemote),
    };
  }

  mapMany(rawList: RemotiveJobPosting[], providerName = 'remotive'): NormalizedJob[] {
    return rawList.map((raw) => this.mapToNormalizedJob(raw, providerName));
  }
}
