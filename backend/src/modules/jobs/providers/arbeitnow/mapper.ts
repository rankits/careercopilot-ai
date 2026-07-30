import { IJobMapper } from '@/modules/jobs/interfaces/IJobMapper.js';
import { NormalizedJob } from '@/modules/jobs/models/NormalizedJob.js';
import { ProviderTier } from '@/modules/jobs/types/job.types.js';
import { ArbeitnowJobPosting } from '@/modules/jobs/providers/arbeitnow/types.js';
import { generateCanonicalHash, normalizeText } from '@/modules/jobs/utils/fingerprint.js';

const cleanRequiredString = (value: string | null | undefined, fieldName: string): string => {
  const cleaned = value?.trim();

  if (!cleaned) {
    throw new Error(`Cannot map Arbeitnow job because "${fieldName}" is missing`);
  }

  return cleaned;
};

const cleanOptionalString = (value: string | null | undefined): string | undefined => {
  const cleaned = value?.trim();

  return cleaned || undefined;
};

const stripHtml = (value: string | null | undefined): string | undefined => {
  if (!value?.trim()) {
    return undefined;
  }

  const cleaned = value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#x26;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || undefined;
};

const toIsoDate = (value: number | string | null | undefined): string | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const epochMilliseconds = value > 1_000_000_000_000 ? value : value * 1000;

    const date = new Date(epochMilliseconds);

    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }

    return undefined;
  }

  if (typeof value === 'string' && value.trim()) {
    const date = new Date(value.trim());

    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return undefined;
};

const mapLocation = (
  location: string | null | undefined,
  remote: boolean | null | undefined,
): NormalizedJob['location'] => {
  const rawLocation = cleanOptionalString(location);

  return {
    raw: rawLocation ?? '',
    isRemote: remote === true,
  };
};

const mapTags = (
  tags: string[] | null | undefined,
  jobTypes: string[] | null | undefined,
): string[] => {
  const values = [...(tags ?? []), ...(jobTypes ?? [])]
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Map(values.map((value) => [value.toLocaleLowerCase(), value])).values());
};

export class ArbeitnowJobMapper implements IJobMapper<ArbeitnowJobPosting> {
  constructor(private readonly tier: ProviderTier = ProviderTier.PUBLIC) {}

  mapToNormalizedJob(raw: ArbeitnowJobPosting, providerName = 'arbeitnow'): NormalizedJob {
    const providerJobId = cleanRequiredString(raw.slug, 'slug');

    const title = cleanRequiredString(raw.title, 'title');

    const companyName = cleanRequiredString(raw.company_name, 'company_name');

    const applyUrl = cleanRequiredString(raw.url, 'url');

    const location = mapLocation(raw.location, raw.remote);

    const description = stripHtml(raw.description) ?? '';

    const tags = mapTags(raw.tags, raw.job_types);

    const postedAt = toIsoDate(raw.created_at) ?? new Date().toISOString();

    return {
      id: providerJobId,
      providerJobId,
      providerName,
      providerTier: this.tier,

      title,
      normalizedTitle: normalizeText(title),

      companyName,
      normalizedCompany: normalizeText(companyName),

      location,

      description,

      applyUrl,

      tags,

      postedAt,

      canonicalHash: generateCanonicalHash(companyName, title, location.raw, location.isRemote),
    };
  }

  mapMany(rawList: ArbeitnowJobPosting[], providerName = 'arbeitnow'): NormalizedJob[] {
    return rawList.map((raw) => this.mapToNormalizedJob(raw, providerName));
  }
}
