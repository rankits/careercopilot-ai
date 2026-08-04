export type EligibilityCheckId =
  | 'PROFILE_COMPLETE'
  | 'JOB_ACTIVE'
  | 'REMOTE_PREFERENCE'
  | 'SALARY_FLOOR'
  | 'COMPANY_BLACKLIST'
  | 'TITLE_EXCLUSION'
  | 'SOURCE_EXCLUSION'
  // Hard-eligibility categories the current job schema cannot evaluate yet
  // (no structured field on `Job` for these) — always surfaced as
  // NOT_EVALUATED rather than silently skipped or fabricated.
  | 'WORK_AUTHORIZATION'
  | 'SPONSORSHIP'
  | 'EXPERIENCE_RANGE';

export type EligibilityCheckStatus = 'PASSED' | 'FAILED' | 'NOT_EVALUATED';

export interface EligibilityCheckResult {
  check: EligibilityCheckId;
  status: EligibilityCheckStatus;
  reason?: string;
}

export interface EligibilityResult {
  eligible: boolean;
  checks: EligibilityCheckResult[];
}
