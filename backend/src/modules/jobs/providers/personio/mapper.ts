import { IJobMapper } from '@/modules/jobs/interfaces/IJobMapper.js';
import { NormalizedJob } from '@/modules/jobs/models/NormalizedJob.js';
import { ProviderTier } from '@/modules/jobs/types/job.types.js';
import { PersonioPosition } from '@/modules/jobs/providers/personio/types.js';
import { generateCanonicalHash, normalizeText } from '@/modules/jobs/utils/fingerprint.js';
import {
  cleanOptionalString,
  cleanRequiredString,
  isRemoteLocation,
  stripHtml,
  toIsoDate,
  uniqueTags,
} from '@/modules/jobs/utils/provider-mapping.js';

export class PersonioJobMapper implements IJobMapper<PersonioPosition> {
  constructor(
    private readonly companyName: string,
    private readonly account: string,
    private readonly tier: ProviderTier = ProviderTier.PUBLIC,
  ) {}

  mapToNormalizedJob(raw: PersonioPosition, providerName = 'personio'): NormalizedJob {
    const providerJobId = cleanRequiredString(raw.id, 'id');
    const title = cleanRequiredString(raw.name, 'name');
    const companyName = cleanRequiredString(this.companyName, 'companyName');
    const locationRaw = cleanOptionalString(raw.office) ?? '';
    const isRemote = isRemoteLocation(locationRaw);
    const applyUrl = `https://${this.account}.jobs.personio.com/job/${providerJobId}`;
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
      location: { raw: locationRaw, isRemote },
      description: stripHtml(raw.descriptionHtml) ?? '',
      applyUrl,
      tags: uniqueTags(
        raw.department ? [raw.department] : undefined,
        raw.recruitingCategory ? [raw.recruitingCategory] : undefined,
        raw.employmentType ? [raw.employmentType] : undefined,
        raw.seniority ? [raw.seniority] : undefined,
        raw.schedule ? [raw.schedule] : undefined,
      ),
      postedAt,
      canonicalHash: generateCanonicalHash(companyName, title, locationRaw, isRemote),
    };
  }

  mapMany(rawList: PersonioPosition[], providerName = 'personio'): NormalizedJob[] {
    return rawList.map((raw) => this.mapToNormalizedJob(raw, providerName));
  }
}
