import { IJobMapper } from '@/modules/jobs/interfaces/IJobMapper.js';
import { NormalizedJob } from '@/modules/jobs/models/NormalizedJob.js';
import { ProviderTier } from '@/modules/jobs/types/job.types.js';
import { GreenhouseJobPosting } from '@/modules/jobs/providers/greenhouse/types.js';
import { generateCanonicalHash, normalizeText } from '@/modules/jobs/utils/fingerprint.js';

const cleanRequiredString = (value: string | null | undefined, fieldName: string): string => {
  const cleaned = value?.trim();

  if (!cleaned) {
    throw new Error(`Cannot map Greenhouse job because "${fieldName}" is missing`);
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

const toIsoDate = (value: string | null | undefined): string | undefined => {
  const cleaned = cleanOptionalString(value);

  if (!cleaned) {
    return undefined;
  }

  const parsed = new Date(cleaned);

  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString();
};

const isRemoteLocation = (location: string | undefined): boolean => {
  if (!location) {
    return false;
  }

  return /\bremote\b/i.test(location);
};

export class GreenhouseJobMapper implements IJobMapper<GreenhouseJobPosting> {
  constructor(
    private readonly defaultCompanyName: string,
    private readonly tier: ProviderTier = ProviderTier.PUBLIC,
  ) {}

  mapToNormalizedJob(raw: GreenhouseJobPosting, providerName = 'greenhouse'): NormalizedJob {
    const providerJobId = cleanRequiredString(
      raw.id !== null && raw.id !== undefined ? String(raw.id) : undefined,
      'id',
    );

    const title = cleanRequiredString(raw.title, 'title');

    const configuredCompanyName = cleanOptionalString(this.defaultCompanyName);

    const companyName = cleanOptionalString(raw.company_name) ?? configuredCompanyName;

    if (!companyName) {
      throw new Error('Cannot map Greenhouse job because "company_name" is missing');
    }

    const applyUrl = cleanRequiredString(raw.absolute_url, 'absolute_url');

    const rawLocation = cleanOptionalString(raw.location?.name);

    const isRemote = isRemoteLocation(rawLocation);

    const description = stripHtml(raw.content);

    const postedAt = toIsoDate(raw.first_published);

    const rawTags = (raw as { tags?: unknown }).tags;
    const tags = Array.isArray(rawTags)
      ? rawTags.map((tag: unknown) => String(tag).trim()).filter(Boolean)
      : [];

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
        raw: rawLocation ?? '',
        isRemote,
      },

      tags,
      description: description ?? '',

      applyUrl,

      postedAt: postedAt ?? '',

      canonicalHash: generateCanonicalHash(companyName, title, rawLocation, isRemote),
    };
  }

  mapMany(rawList: GreenhouseJobPosting[], providerName = 'greenhouse'): NormalizedJob[] {
    return rawList.map((raw) => this.mapToNormalizedJob(raw, providerName));
  }
}
