import type { JobListDto } from '@/modules/job-listing/types/job-listing.types.js';
import type {
  RecommendationContext,
  RecommendationFilterMode,
} from '@/modules/recommendations/types/recommendations.types.js';
import { recordCertificationFilterExclusion } from '@/modules/recommendations/observability/recommendation.metrics.js';
import { tokenize } from '@/modules/recommendations/utils/recommendation-matching.js';

const normalizeToken = (value: string): string => value.trim().toLowerCase();
const normalizePhrase = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const DEFAULT_FILTER_MODE: RecommendationFilterMode = 'STRICT';

export const resolveRecommendationFilterMode = (
  context: Pick<RecommendationContext, 'filterMode'>,
): RecommendationFilterMode => context.filterMode ?? DEFAULT_FILTER_MODE;

export type CandidateJobFilterViolation =
  | 'EMPLOYMENT_TYPE'
  | 'EXCLUDED_COMPANY'
  | 'LOCATION'
  | 'REQUIRED_CERTIFICATION'
  | 'REMOTE_PREFERENCE'
  | 'SALARY_CURRENCY'
  | 'SALARY_MAXIMUM'
  | 'SALARY_MINIMUM'
  | 'VISA_SPONSORSHIP'
  | 'WORK_AUTHORIZATION';

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

export const matchesRemotePreference = (job: JobListDto, remotePreference?: string): boolean => {
  if (!remotePreference) return true;
  const preference = normalizeToken(remotePreference);
  if (!preference || preference === 'any') return true;
  const remoteType = job.location.remoteType ? normalizeToken(job.location.remoteType) : '';
  const formatted = normalizeToken(job.location.formatted);
  return remoteType === preference || formatted.includes(preference);
};

const matchesSalaryCurrency = (job: JobListDto, currency?: string): boolean => {
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

export const matchesCertificationRequirements = (
  job: JobListDto,
  candidateCertifications: readonly string[],
): boolean => {
  const required = job.recommendationEligibility?.requiredCertifications ?? [];
  const requiredNormalized = required.map(normalizePhrase).filter(Boolean);
  if (requiredNormalized.length === 0) return true;
  const available = new Set(candidateCertifications.map(normalizePhrase).filter(Boolean));
  return requiredNormalized.every((certification) => available.has(certification));
};

export const matchesWorkAuthorizationRequirements = (
  job: JobListDto,
  context: RecommendationContext,
): boolean => {
  const eligibility = job.recommendationEligibility;
  if (!eligibility) return true;

  const candidateCountries = [
    ...(context.eligibleCountries ?? []),
    ...(context.workAuthorizationRequirement?.eligibleCountries ?? []),
  ]
    .map(normalizePhrase)
    .filter(Boolean);
  const jobCountries = (eligibility.eligibleCountries ?? []).map(normalizePhrase).filter(Boolean);
  if (
    jobCountries.length > 0 &&
    candidateCountries.length > 0 &&
    !candidateCountries.some((country) => jobCountries.includes(country))
  ) {
    return false;
  }

  const candidateRequiresSponsorship =
    context.requiresSponsorship ??
    context.workAuthorizationRequirement?.requiresSponsorship ??
    (context.workAuthorization === 'NEEDS_SPONSORSHIP' ? true : undefined);
  if (candidateRequiresSponsorship === true && eligibility.sponsorshipOffered === false) {
    return false;
  }

  if (eligibility.requiresWorkAuthorization === true && context.workAuthorization) {
    if (context.workAuthorization === 'UNKNOWN') return false;
    if (
      context.workAuthorization === 'NEEDS_SPONSORSHIP' &&
      eligibility.sponsorshipOffered === false
    ) {
      return false;
    }
  }

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
  if (!matchesCertificationRequirements(job, context.certifications)) {
    violations.push('REQUIRED_CERTIFICATION');
  }
  if (!matchesWorkAuthorizationRequirements(job, context)) {
    const candidateRequiresSponsorship =
      context.requiresSponsorship ??
      context.workAuthorizationRequirement?.requiresSponsorship ??
      (context.workAuthorization === 'NEEDS_SPONSORSHIP' ? true : undefined);
    violations.push(candidateRequiresSponsorship ? 'VISA_SPONSORSHIP' : 'WORK_AUTHORIZATION');
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
  if (violations.includes('REQUIRED_CERTIFICATION')) {
    recordCertificationFilterExclusion();
  }
  return violations.length === 0;
};
