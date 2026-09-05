export interface JobSearchFilters {
  query?: string;
  companySlug?: string;
  location?: string;
  employmentTypes?: string[];
  remoteTypes?: string[];
  skills?: string[];
  minSalary?: number;
  maxSalary?: number;
  /**
   * Optional ISO currency code.
   * When omitted with min/max salary, USD bands are converted across currencies.
   * When set, salary filters apply only within that currency.
   */
  currency?: string;
  postedWithinDays?: number;
  postedSince?: Date;
}

export interface JobSearchPagination {
  page: number;
  limit: number;
}

export type JobSortBy = 'newest' | 'salaryHighToLow' | 'salaryLowToHigh';

export interface JobSearchOptions {
  filters: JobSearchFilters;
  pagination: JobSearchPagination;
  sortBy: JobSortBy;
}

export interface PaginatedJobResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface JobRecommendationEligibility {
  /** Certifications explicitly required by the job; omitted/empty means unknown or not required. */
  requiredCertifications?: string[];
  /** Countries whose residents/citizens are eligible when the posting discloses a restriction. */
  eligibleCountries?: string[];
  /** Whether the employer explicitly offers sponsorship for this role. */
  sponsorshipOffered?: boolean | null;
  /** Whether the role explicitly requires existing work authorization. */
  requiresWorkAuthorization?: boolean | null;
}

/**
 * Frozen public listing contract for GET /api/v1/jobs and shared fields on detail.
 * Additive fields only; do not rename/remove without a versioned migration.
 */
export interface JobListDto {
  id: string;
  title: string;
  company: {
    slug: string;
    name: string;
    logoUrl: string | null;
    verified: boolean;
  };
  location: {
    formatted: string;
    remoteType: string | null;
  };
  employmentType: string | null;
  salary: {
    minimum: number | null;
    maximum: number | null;
    currency: string | null;
  };
  skills: string[];
  publishedAt: string | null;
  /** Primary JobSource apply URL (priority desc); http(s) only, else null. */
  applyUrl: string | null;
  /** Present for authenticated users when the job is bookmarked (Application status SAVED). */
  isSaved?: boolean;
  /** Optional internal eligibility metadata for recommendation filtering when providers expose it. */
  recommendationEligibility?: JobRecommendationEligibility;
}

export interface JobDetailDto extends JobListDto {
  descriptionHtml: string;
  descriptionText: string;
  benefits: string[];
  tags: string[];
  companyIndustry: string | null;
  companySize: string | null;
}
