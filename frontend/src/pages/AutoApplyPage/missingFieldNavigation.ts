import { ROUTES } from '@/constants/routes';

export type AutoApplyTabId =
  'profile' | 'answers' | 'resumes' | 'rules' | 'consents' | 'submissions';

export type FixDestination = { kind: 'tab'; tab: AutoApplyTabId } | { kind: 'route'; href: string };

export interface MissingFieldFixAction {
  /** Stable id for React keys (field or reason code) */
  id: string;
  /** Raw field / question key when known */
  field?: string;
  /** Short human label shown on the button */
  label: string;
  /** Where the user should go to fix this */
  destination: FixDestination;
  /** Optional hint shown under the button */
  hint?: string;
  /** Full readiness message when available */
  message?: string;
}

export interface ReadinessReasonLike {
  code: string;
  message: string;
  field?: string;
  severity: 'BLOCKING' | 'WARNING';
  metadata?: Record<string, unknown>;
}

const FIELD_FIX_MAP: Record<string, Omit<MissingFieldFixAction, 'id' | 'field' | 'message'>> = {
  workAuthorization: {
    label: 'Add work authorization',
    destination: { kind: 'tab', tab: 'answers' },
    hint: 'Add a verified answer with key work_authorization',
  },
  work_authorization: {
    label: 'Add work authorization',
    destination: { kind: 'tab', tab: 'answers' },
    hint: 'Add a verified answer with key work_authorization',
  },
  yearsOfExperience: {
    label: 'Add years of experience',
    destination: { kind: 'tab', tab: 'answers' },
    hint: 'Add a verified answer with key years_of_experience',
  },
  years_of_experience: {
    label: 'Add years of experience',
    destination: { kind: 'tab', tab: 'answers' },
    hint: 'Add a verified answer with key years_of_experience',
  },
  noticePeriodDays: {
    label: 'Add notice period',
    destination: { kind: 'tab', tab: 'answers' },
    hint: 'Add a verified answer with key notice_period_days',
  },
  notice_period_days: {
    label: 'Add notice period',
    destination: { kind: 'tab', tab: 'answers' },
    hint: 'Add a verified answer with key notice_period_days',
  },
  requiresSponsorship: {
    label: 'Set sponsorship preference',
    destination: { kind: 'tab', tab: 'profile' },
    hint: 'Update “Requires sponsorship” on your Auto Apply profile',
  },
  sponsorship_required: {
    label: 'Add sponsorship answer',
    destination: { kind: 'tab', tab: 'answers' },
    hint: 'Add a verified answer with key sponsorship_required',
  },
  resumeVersionId: {
    label: 'Approve a resume',
    destination: { kind: 'tab', tab: 'resumes' },
    hint: 'Approve an active resume version for the planner',
  },
  resume: {
    label: 'Approve a resume',
    destination: { kind: 'tab', tab: 'resumes' },
  },
  profile: {
    label: 'Complete profile',
    destination: { kind: 'tab', tab: 'profile' },
  },
  willingToRelocate: {
    label: 'Set relocation preference',
    destination: { kind: 'tab', tab: 'profile' },
  },
  name: {
    label: 'Update account name',
    destination: { kind: 'tab', tab: 'profile' },
    hint: 'Name comes from your account profile',
  },
  email: {
    label: 'Update account email',
    destination: { kind: 'tab', tab: 'profile' },
    hint: 'Email comes from your account profile',
  },
  portfolioUrl: {
    label: 'Add portfolio link',
    destination: { kind: 'tab', tab: 'profile' },
  },
  portfolio: {
    label: 'Add portfolio link',
    destination: { kind: 'tab', tab: 'profile' },
    hint: 'Add a portfolio URL on your Auto Apply profile',
  },
  currentWorkRegion: {
    label: 'Add work region',
    destination: { kind: 'tab', tab: 'answers' },
    hint: 'Add a verified answer with key current_work_region (e.g. India, United States)',
  },
  current_work_region: {
    label: 'Add work region',
    destination: { kind: 'tab', tab: 'answers' },
    hint: 'Add a verified answer with key current_work_region',
  },
  mobileDesignExperienceYears: {
    label: 'Add mobile design experience',
    destination: { kind: 'tab', tab: 'answers' },
    hint: 'Add a verified answer with key mobile_design_experience',
  },
  mobile_design_experience: {
    label: 'Add mobile design experience',
    destination: { kind: 'tab', tab: 'answers' },
    hint: 'Describe mobile product-design background (years or brief summary)',
  },
  matchScore: {
    label: 'Open For You',
    destination: { kind: 'route', href: ROUTES.FOR_YOU },
    hint: 'A match score comes from job recommendations — not a form field you type in',
  },
  consent: {
    label: 'Review consents',
    destination: { kind: 'tab', tab: 'consents' },
  },
};

const CODE_FIX_MAP: Record<string, Omit<MissingFieldFixAction, 'id' | 'message'>> = {
  MATCH_SCORE_MISSING: {
    field: 'matchScore',
    label: 'Open For You',
    destination: { kind: 'route', href: ROUTES.FOR_YOU },
    hint: 'Run or open recommendations so this job gets a match score',
  },
  MATCH_SCORE_BELOW_THRESHOLD: {
    field: 'matchScore',
    label: 'Adjust match rules',
    destination: { kind: 'tab', tab: 'rules' },
    hint: 'Lower the minimum match score on the Rules tab, or pick a better-matched job',
  },
  CONSENT_REQUIRED: {
    field: 'consent',
    label: 'Grant consent',
    destination: { kind: 'tab', tab: 'consents' },
  },
  RESUME_MISSING: {
    field: 'resumeVersionId',
    label: 'Approve a resume',
    destination: { kind: 'tab', tab: 'resumes' },
  },
  RESUME_INACTIVE: {
    field: 'resumeVersionId',
    label: 'Approve a resume',
    destination: { kind: 'tab', tab: 'resumes' },
  },
  WORK_AUTHORIZATION_MISSING: {
    field: 'workAuthorization',
    label: 'Add work authorization',
    destination: { kind: 'tab', tab: 'answers' },
    hint: 'Add a verified answer with key work_authorization',
  },
  NOTICE_PERIOD_MISSING: {
    field: 'noticePeriodDays',
    label: 'Add notice period',
    destination: { kind: 'tab', tab: 'answers' },
  },
  EXPERIENCE_MISSING: {
    field: 'yearsOfExperience',
    label: 'Add years of experience',
    destination: { kind: 'tab', tab: 'answers' },
  },
  PROFILE_MISSING: {
    field: 'profile',
    label: 'Complete profile',
    destination: { kind: 'tab', tab: 'profile' },
  },
  WORK_REGION_VERIFICATION_REQUIRED: {
    field: 'currentWorkRegion',
    label: 'Add work region',
    destination: { kind: 'tab', tab: 'answers' },
    hint: 'Confirm where you are based (key: current_work_region)',
  },
  JOB_LOCATION_REQUIREMENT_NOT_MET: {
    field: 'currentWorkRegion',
    label: 'Review work region',
    destination: { kind: 'tab', tab: 'answers' },
    hint: 'This role restricts candidate location — update current_work_region if wrong',
  },
  EXPERIENCE_REQUIREMENT_UNKNOWN: {
    field: 'yearsOfExperience',
    label: 'Add years of experience',
    destination: { kind: 'tab', tab: 'answers' },
  },
  MOBILE_DESIGN_EVIDENCE_REQUIRED: {
    field: 'mobileDesignExperienceYears',
    label: 'Add mobile design experience',
    destination: { kind: 'tab', tab: 'answers' },
  },
  PORTFOLIO_EVIDENCE_REQUIRED: {
    field: 'portfolio',
    label: 'Add portfolio link',
    destination: { kind: 'tab', tab: 'profile' },
  },
  ANALYSIS_STALE: {
    field: 'analysis',
    label: 'Re-prepare application',
    destination: { kind: 'tab', tab: 'submissions' },
    hint: 'Refresh Prepare Application so job-page analysis is current',
  },
};

/** Maps planner field names to snake_case answer vault keys for form prefill. */
const ANSWER_KEY_BY_FIELD: Record<string, string> = {
  workAuthorization: 'work_authorization',
  work_authorization: 'work_authorization',
  yearsOfExperience: 'years_of_experience',
  years_of_experience: 'years_of_experience',
  noticePeriodDays: 'notice_period_days',
  notice_period_days: 'notice_period_days',
  sponsorship_required: 'sponsorship_required',
  currentWorkRegion: 'current_work_region',
  current_work_region: 'current_work_region',
  mobileDesignExperienceYears: 'mobile_design_experience',
  mobile_design_experience: 'mobile_design_experience',
  mobile_design_experience_years: 'mobile_design_experience',
};

export function answerKeyForMissingField(field: string): string | undefined {
  return ANSWER_KEY_BY_FIELD[field];
}

/**
 * Maps planner/readiness missing-field codes to in-app navigation actions.
 * Unknown fields fall back to Verified Answers with a generic label.
 */
export function resolveMissingFieldFixActions(fields: string[]): MissingFieldFixAction[] {
  const seen = new Set<string>();
  const actions: MissingFieldFixAction[] = [];

  for (const raw of fields) {
    const field = raw.trim();
    if (!field || seen.has(field)) continue;
    seen.add(field);

    const mapped = FIELD_FIX_MAP[field];
    if (mapped) {
      actions.push({ id: field, field, ...mapped });
    } else {
      actions.push({
        id: field,
        field,
        label: `Fix ${field.replace(/_/g, ' ')}`,
        destination: { kind: 'tab', tab: 'answers' },
        hint: `Add or update this in Verified Answers (key: ${field})`,
      });
    }
  }

  return actions;
}

/**
 * Prefer readiness reasons (code + message) so blockers without a `field`
 * (e.g. match score) still get a clear action.
 */
export function resolveReadinessFixActions(
  reasons: ReadinessReasonLike[],
  unresolvedQuestions: string[] = [],
): MissingFieldFixAction[] {
  const seen = new Set<string>();
  const actions: MissingFieldFixAction[] = [];

  for (const reason of reasons) {
    const key = reason.field ?? reason.code;
    if (!key || seen.has(key) || seen.has(reason.code)) continue;
    seen.add(key);
    seen.add(reason.code);

    const byCode = CODE_FIX_MAP[reason.code];
    if (byCode) {
      actions.push({
        id: reason.code,
        message: reason.message,
        ...byCode,
      });
      continue;
    }

    if (reason.field && FIELD_FIX_MAP[reason.field]) {
      actions.push({
        id: reason.field,
        field: reason.field,
        message: reason.message,
        ...FIELD_FIX_MAP[reason.field],
      });
      continue;
    }

    actions.push({
      id: reason.code,
      field: reason.field,
      label: reason.field ? `Fix ${reason.field}` : 'See details',
      destination: { kind: 'tab', tab: 'answers' },
      message: reason.message,
      hint: reason.message,
    });
  }

  for (const action of resolveMissingFieldFixActions(unresolvedQuestions)) {
    const dedupeKey = action.field ?? action.id;
    if (seen.has(dedupeKey) || seen.has(action.id)) continue;
    seen.add(dedupeKey);
    actions.push(action);
  }

  return actions;
}
