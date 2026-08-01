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
  applyUrl: string | null;
}

export interface JobListPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface JobListResult {
  items: JobListDto[];
  pagination: JobListPagination;
}

export interface ListJobsParams {
  page?: number;
  limit?: number;
  sortBy?: 'newest' | 'salaryHighToLow' | 'salaryLowToHigh';
  query?: string;
  location?: string;
  remoteTypes?: string | string[];
  employmentTypes?: string | string[];
  skills?: string | string[];
  minSalary?: number;
  maxSalary?: number;
}
