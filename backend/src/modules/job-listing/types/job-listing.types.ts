export interface JobSearchFilters {
  query?: string;
  companySlug?: string;
  location?: string;
  employmentTypes?: string[];
  remoteTypes?: string[];
  skills?: string[];
  minSalary?: number;
  maxSalary?: number;
  currency?: string;
  postedWithinDays?: number;
}

export interface JobSearchPagination {
  page: number;
  limit: number;
}

export type JobSortBy =
  | "relevance"
  | "newest"
  | "salaryHighToLow"
  | "salaryLowToHigh";

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
  expiresAt: string | null;
}

export interface JobDetailDto extends JobListDto {
  descriptionHtml: string;
  descriptionText: string;
  benefits: string[];
  tags: string[];
  companyIndustry: string | null;
  companySize: string | null;
}
