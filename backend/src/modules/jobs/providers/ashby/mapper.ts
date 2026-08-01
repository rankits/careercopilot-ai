import { IJobMapper } from '@/modules/jobs/interfaces/IJobMapper.js';
import { NormalizedJob } from '@/modules/jobs/models/NormalizedJob.js';
import { JobSalaryPeriod, ProviderTier } from '@/modules/jobs/types/job.types.js';
import { AshbyJobPosting } from '@/modules/jobs/providers/ashby/types.js';
import { generateCanonicalHash, normalizeText } from '@/modules/jobs/utils/fingerprint.js';
import {
  cleanOptionalString,
  cleanRequiredString,
  stripHtml,
  toIsoDate,
  uniqueTags,
} from '@/modules/jobs/utils/provider-mapping.js';

const parseCompensation = (
  summary: string | null | undefined,
): NormalizedJob['salary'] | undefined => {
  if (!summary?.trim()) return undefined;
  const matches = summary.match(/([\d,]+(?:\.\d+)?)/g);
  if (!matches || matches.length === 0) return undefined;
  const nums = matches.map((m) => Number(m.replace(/,/g, ''))).filter((n) => Number.isFinite(n));
  if (nums.length === 0) return undefined;
  const currencyMatch = summary.match(/\b([A-Z]{3})\b/);
  return {
    min: Math.min(...nums),
    max: Math.max(...nums),
    currency: currencyMatch?.[1] ?? 'USD',
    period: JobSalaryPeriod.YEARLY,
  };
};

export class AshbyJobMapper implements IJobMapper<AshbyJobPosting> {
  constructor(
    private readonly companyName: string,
    private readonly tier: ProviderTier = ProviderTier.PUBLIC,
  ) {}

  mapToNormalizedJob(raw: AshbyJobPosting, providerName = 'ashby'): NormalizedJob {
    const providerJobId = cleanRequiredString(raw.id, 'id');
    const title = cleanRequiredString(raw.title, 'title');
    const companyName = cleanRequiredString(this.companyName, 'companyName');
    const applyUrl = cleanRequiredString(raw.jobUrl ?? raw.applyUrl ?? undefined, 'jobUrl');
    const locationRaw =
      cleanOptionalString(raw.location) ?? cleanOptionalString(raw.secondaryLocations?.[0]) ?? '';
    const isRemote =
      raw.isRemote === true ||
      /\bremote\b/i.test(raw.workplaceType ?? '') ||
      /\bremote\b/i.test(locationRaw);
    const postedAt = toIsoDate(raw.publishedAt) ?? new Date().toISOString();
    const salary = parseCompensation(
      raw.compensation?.scrapeableCompensationSalarySummary ??
        raw.compensation?.compensationTierSummary,
    );

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
      description: stripHtml(raw.descriptionHtml ?? raw.descriptionPlain) ?? '',
      applyUrl,
      salary,
      tags: uniqueTags(
        raw.department ? [raw.department] : undefined,
        raw.team ? [raw.team] : undefined,
        raw.employmentType ? [raw.employmentType] : undefined,
        raw.workplaceType ? [raw.workplaceType] : undefined,
      ),
      postedAt,
      canonicalHash: generateCanonicalHash(companyName, title, locationRaw, isRemote),
    };
  }

  mapMany(rawList: AshbyJobPosting[], providerName = 'ashby'): NormalizedJob[] {
    return rawList.map((raw) => this.mapToNormalizedJob(raw, providerName));
  }
}
