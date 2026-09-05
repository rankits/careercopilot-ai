export interface ArbeitnowJobPosting {
  readonly slug: string;
  readonly company_name: string;
  readonly title: string;
  readonly description: string;
  readonly remote?: boolean;
  readonly url: string;
  readonly tags?: string[];
  readonly job_types?: string[];
  readonly location?: string;
  readonly created_at?: number | string;
}

export interface ArbeitnowJobsResponse {
  readonly data?: ArbeitnowJobPosting[];
  readonly links?: {
    readonly first?: string | null;
    readonly last?: string | null;
    readonly prev?: string | null;
    readonly next?: string | null;
  };
}
