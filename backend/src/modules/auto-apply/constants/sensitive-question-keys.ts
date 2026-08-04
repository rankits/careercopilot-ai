/**
 * Implements the AJA-PROD-005 policy locked in docs/auto-apply/00-overview-and-decisions.md:
 * demographic/disability/veteran-status questions are never stored at all;
 * work-authorization/salary/notice-period style questions are storable but
 * always start non-auto-submittable regardless of what the caller requests.
 */

export const PROHIBITED_QUESTION_KEYS: ReadonlySet<string> = new Set([
  'demographic_gender',
  'demographic_race_ethnicity',
  'demographic_age',
  'disability_status',
  'veteran_status',
  'marital_status',
  'religion',
  'criminal_history',
]);

export const SENSITIVE_QUESTION_KEYS: ReadonlySet<string> = new Set([
  'work_authorization',
  'sponsorship_required',
  'expected_salary',
  'current_salary',
  'notice_period_days',
]);
