export interface RemotiveJobPosting {
  readonly id: number | string;
  readonly url: string;
  readonly title: string;
  readonly company_name: string;
  readonly company_logo?: string | null;
  readonly category?: string | null;
  readonly tags?: string[] | null;
  readonly job_type?: string | null;
  readonly publication_date?: string | null;
  readonly candidate_required_location?: string | null;
  readonly salary?: string | null;
  readonly description?: string | null;
}

export interface RemotiveJobsResponse {
  readonly 'job-count'?: number;
  readonly jobs?: RemotiveJobPosting[];
}
