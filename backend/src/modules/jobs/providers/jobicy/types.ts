export interface JobicyJobPosting {
  readonly id: number | string;
  readonly url: string;
  readonly jobSlug?: string;
  readonly jobTitle: string;
  readonly companyName: string;
  readonly companyLogo?: string | null;
  readonly jobIndustry?: string[] | string | null;
  readonly jobType?: string[] | string | null;
  readonly jobGeo?: string | null;
  readonly jobLevel?: string | null;
  readonly jobExcerpt?: string | null;
  readonly jobDescription?: string | null;
  readonly pubDate?: string | null;
  readonly salaryMin?: number | null;
  readonly salaryMax?: number | null;
  readonly salaryCurrency?: string | null;
  readonly salaryPeriod?: string | null;
}

export interface JobicyJobsResponse {
  readonly jobs?: JobicyJobPosting[];
}
