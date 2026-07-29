export interface GreenhouseJobLocation {
  readonly name: string;
}

export interface GreenhouseJobPosting {
  readonly id: number;
  readonly internal_job_id?: number;
  readonly title: string;
  readonly company_name?: string;
  readonly location: GreenhouseJobLocation;
  readonly absolute_url: string;
  readonly updated_at?: string;
  readonly first_published?: string;
  readonly requisition_id?: string;
  readonly content?: string;
  readonly metadata?: unknown;
}

export interface GreenhouseBoardJobsResponse {
  readonly jobs: GreenhouseJobPosting[];
}
