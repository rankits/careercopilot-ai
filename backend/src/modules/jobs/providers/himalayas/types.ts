export interface HimalayasJobPosting {
  readonly title: string;
  readonly excerpt?: string | null;
  readonly companyName: string;
  readonly companySlug?: string | null;
  readonly companyLogo?: string | null;
  readonly employmentType?: string | null;
  readonly minSalary?: number | null;
  readonly maxSalary?: number | null;
  readonly salaryPeriod?: string | null;
  readonly seniority?: string[] | string | null;
  readonly currency?: string | null;
  readonly locationRestrictions?: string[] | null;
  readonly timezoneRestrictions?: string[] | null;
  readonly categories?: string[] | null;
  readonly parentCategories?: string[] | null;
  readonly description?: string | null;
  readonly pubDate?: number | string | null;
  readonly expiryDate?: number | string | null;
  readonly applicationLink?: string | null;
  readonly guid: string;
}

export interface HimalayasJobsResponse {
  readonly jobs?: HimalayasJobPosting[];
  readonly offset?: number;
  readonly limit?: number;
  readonly totalCount?: number;
}
