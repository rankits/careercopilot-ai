export interface RemoteJobsOrgCompany {
  readonly name?: string;
  readonly logo_url?: string | null;
  readonly website?: string | null;
  readonly url?: string | null;
}

export interface RemoteJobsOrgPosting {
  readonly id: string;
  readonly title: string;
  readonly url?: string | null;
  readonly apply_url?: string | null;
  readonly company?: RemoteJobsOrgCompany | string | null;
  readonly category?: string | null;
  readonly location?: string | null;
  readonly salary_min?: number | null;
  readonly salary_max?: number | null;
  readonly salary_text?: string | null;
  readonly type?: string | null;
  readonly description?: string | null;
  readonly posted_at?: string | null;
}

export interface RemoteJobsOrgResponse {
  readonly data?: RemoteJobsOrgPosting[];
}
