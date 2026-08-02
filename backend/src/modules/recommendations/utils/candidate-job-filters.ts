import type { JobListDto } from '@/modules/job-listing/types/job-listing.types.js';
import type {
  RecommendationContext,
  RecommendationFilterMode,
} from '@/modules/recommendations/types/recommendations.types.js';
import { tokenize } from '@/modules/recommendations/utils/recommendation-matching.js';

const normalizeToken = (value: string): string => value.trim().toLowerCase();
const DEFAULT_FILTER_MODE: RecommendationFilterMode = 'STRICT';

export const resolveRecommendationFilterMode = (
  context: Pick<RecommendationContext, 'filterMode'>,
): RecommendationFilterMode => context.filterMode ?? DEFAULT_FILTER_MODE;

export type CandidateJobFilterViolation =
  | 'EMPLOYMENT_TYPE'
  | 'EXCLUDED_COMPANY'
  | 'LOCATION'
  | 'REMOTE_PREFERENCE'
  | 'SALARY_CURRENCY'
  | 'SALARY_MAXIMUM'
  | 'SALARY_MINIMUM';

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

export const matchesRemotePreference = (
  job: JobListDto,
  remotePreference?: string,
): boolean => {
  if (!remotePreference) return true;
  const preference = normalizeToken(remotePreference);
  if (!preference || preference === 'any') return true;
  const remoteType = job.location.remoteType ? normalizeToken(job.location.remoteType) : '';
  const formatted = normalizeToken(job.location.formatted);
  return remoteType === preference || formatted.includes(preference);
};

const matchesSalaryCurrency = (
  job: JobListDto,
  currency?: string,
): boolean => {
  if (!currency || !job.salary.currency) return true;
  return currency.trim().toUpperCase() === job.salary.currency.trim().toUpperCase();
};

export const matchesSalaryFloor = (
  job: JobListDto,
  minimum?: number,
  currency?: string,
): boolean => {
  if (minimum === undefined) return true;
  if (!matchesSalaryCurrency(job, currency)) return false;
  const jobCeiling = job.salary.maximum ?? job.salary.minimum;
  if (jobCeiling === null) return false;
  return jobCeiling >= minimum;
};

export const matchesSalaryCeiling = (
  job: JobListDto,
  maximum?: number,
  currency?: string,
): boolean => {
  if (maximum === undefined) return true;
  if (!matchesSalaryCurrency(job, currency)) return false;
  const jobFloor = job.salary.minimum ?? job.salary.maximum;
  if (jobFloor === null) return true;
  if (jobFloor > maximum) return false;
  return true;
};

export const getCandidateJobFilterViolations = (
  job: JobListDto,
  context: RecommendationContext,
): CandidateJobFilterViolation[] => {
  const violations: CandidateJobFilterViolation[] = [];
  if (!matchesEmploymentType(job, context.employmentTypes)) {
    violations.push('EMPLOYMENT_TYPE');
  }
  if (isExcludedCompany(job, context.excludedCompanies)) {
    violations.push('EXCLUDED_COMPANY');
  }
  if (!matchesLocationPreference(job, context.locations)) {
    violations.push('LOCATION');
  }
  if (!matchesRemotePreference(job, context.remotePreference)) {
    violations.push('REMOTE_PREFERENCE');
  }
  if (!matchesSalaryCurrency(job, context.salaryExpectation.currency)) {
    violations.push('SALARY_CURRENCY');
  }
  if (
    !matchesSalaryFloor(
      job,
      context.salaryMinimumNonNegotiable ?? context.salaryExpectation.minimum,
      context.salaryExpectation.currency,
    )
  ) {
    violations.push('SALARY_MINIMUM');
  }
  if (
    !matchesSalaryCeiling(
      job,
      context.salaryExpectation.maximum,
      context.salaryExpectation.currency,
    )
  ) {
    violations.push('SALARY_MAXIMUM');
  }
  return violations;
};

export const hasFlexibleFilterViolation = (
  job: JobListDto,
  context: RecommendationContext,
): boolean =>
  getCandidateJobFilterViolations(job, context).some(
    (violation) => violation !== 'EXCLUDED_COMPANY',
  );

/** Post-filters that JobListDto can evaluate after vector search hydration. */
export const passesCandidateJobFilters = (
  job: JobListDto,
  context: RecommendationContext,
): boolean => {
  const violations = getCandidateJobFilterViolations(job, context);
  if (resolveRecommendationFilterMode(context) === 'FLEXIBLE') {
    return !violations.includes('EXCLUDED_COMPANY');
  }
  return violations.length === 0;
};
