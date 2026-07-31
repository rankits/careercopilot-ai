import type { JobListDto } from '@/modules/job-listing/types/job-listing.types.js';
import type { RecommendationContext } from '@/modules/recommendations/types/recommendations.types.js';
import { tokenize } from '@/modules/recommendations/utils/recommendation-matching.js';

const normalizeToken = (value: string): string => value.trim().toLowerCase();

export const matchesEmploymentType = (job: JobListDto, allowed: readonly string[]): boolean => {
  if (!allowed.length) return true;
  if (!job.employmentType) return false;
  const current = normalizeToken(job.employmentType);
  return allowed.some((value) => normalizeToken(value) === current);
};

export const isExcludedCompany = (job: JobListDto, excluded: readonly string[]): boolean => {
  if (!excluded.length) return false;
  const companyName = normalizeToken(job.company.name);
  const companySlug = normalizeToken(job.company.slug);
  return excluded.some((value) => {
    const token = normalizeToken(value);
    return token === companyName || token === companySlug;
  });
};

export const matchesLocationPreference = (
  job: JobListDto,
  locations: readonly string[],
): boolean => {
  if (!locations.length) return true;
  const haystack = `${job.location.formatted} ${job.location.remoteType ?? ''}`.toLowerCase();
  return locations.some((location) => {
    const tokens = tokenize(location);
    if (tokens.length === 0) return false;
    return tokens.every((token) => haystack.includes(token));
  });
};

export const matchesSalaryCeiling = (
  job: JobListDto,
  maximum?: number,
  currency?: string,
): boolean => {
  if (maximum === undefined) return true;
  const jobFloor = job.salary.minimum ?? job.salary.maximum;
  if (jobFloor === null) return true;
  if (jobFloor > maximum) return false;
  if (
    currency &&
    job.salary.currency &&
    currency.trim().toUpperCase() !== job.salary.currency.trim().toUpperCase()
  ) {
    return false;
  }
  return true;
};

/** Post-filters that JobListDto can evaluate after vector search hydration. */
export const passesCandidateJobFilters = (
  job: JobListDto,
  context: RecommendationContext,
): boolean =>
  matchesEmploymentType(job, context.employmentTypes) &&
  !isExcludedCompany(job, context.excludedCompanies) &&
  matchesLocationPreference(job, context.locations) &&
  matchesSalaryCeiling(job, context.salaryExpectation.maximum, context.salaryExpectation.currency);
