export interface RemoteOkJobPosting {
  readonly id?: string | number;
  readonly slug?: string;
  readonly epoch?: number;
  readonly date?: string;
  readonly company?: string;
  readonly company_logo?: string;
  readonly position?: string;
  readonly tags?: string[];
  readonly description?: string;
  readonly location?: string;
  readonly apply_url?: string;
  readonly url?: string;
  readonly salary_min?: number;
  readonly salary_max?: number;
  readonly legal?: string;
}

export type RemoteOkResponse = Array<RemoteOkJobPosting>;
