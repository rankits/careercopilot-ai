export interface RecruiteeSalary {
  readonly min?: number | null;
  readonly max?: number | null;
  readonly period?: string | null;
  readonly currency?: string | null;
}

export interface RecruiteeOffer {
  readonly id: number | string;
  readonly title?: string | null;
  readonly position?: string | null;
  readonly company_name?: string | null;
  readonly description?: string | null;
  readonly requirements?: string | null;
  readonly careers_apply_url?: string | null;
  readonly careers_url?: string | null;
  readonly location?: string | null;
  readonly city?: string | null;
  readonly country?: string | null;
  readonly country_code?: string | null;
  readonly remote?: boolean | null;
  readonly hybrid?: boolean | null;
  readonly tags?: string[] | null;
  readonly department?: string | null;
  readonly salary?: RecruiteeSalary | null;
  readonly published_at?: string | null;
  readonly created_at?: string | null;
  readonly updated_at?: string | null;
  readonly status?: string | null;
}

export interface RecruiteeOffersResponse {
  readonly offers?: RecruiteeOffer[];
}
