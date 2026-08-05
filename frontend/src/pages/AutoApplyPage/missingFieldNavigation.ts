import { ROUTES } from '@/constants/routes';

import type { SetupSectionId } from '@/features/auto-apply/types/autoApply.types';

export type AutoApplyTabId =
  'profile' | 'answers' | 'resumes' | 'rules' | 'consents' | 'submissions';

export type FixDestination =
  | { kind: 'section'; sectionId: SetupSectionId; fieldId?: string }
  | { kind: 'tab'; tab: AutoApplyTabId; fieldId?: string }
  | { kind: 'route'; href: string };

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
  /** Plain-language gap label for setup toasts (AA-029) */
  toastLabel?: string;
}

export interface ReadinessReasonLike {
  code: string;
  message: string;
  field?: string;
  severity: 'BLOCKING' | 'WARNING';
  metadata?: Record<string, unknown>;
}

type SectionFix = Omit<MissingFieldFixAction, 'id' | 'field' | 'message'>;

const FIELD_FIX_MAP: Record<string, SectionFix> = {
  workAuthorization: {
    label: 'Add work authorization',
    toastLabel: 'work authorization',
    destination: { kind: 'section', sectionId: 'work-auth', fieldId: 'work_authorization' },
  },
  work_authorization: {
    label: 'Add work authorization',
    toastLabel: 'work authorization',
    destination: { kind: 'section', sectionId: 'work-auth', fieldId: 'work_authorization' },
  },
  yearsOfExperience: {
    label: 'Add years of experience',
    toastLabel: 'years of experience',
    destination: { kind: 'section', sectionId: 'answers', fieldId: 'years_of_experience' },
  },
  years_of_experience: {
    label: 'Add years of experience',
    toastLabel: 'years of experience',
    destination: { kind: 'section', sectionId: 'answers', fieldId: 'years_of_experience' },
  },
  noticePeriodDays: {
    label: 'Add notice period',
    toastLabel: 'notice period',
    destination: { kind: 'section', sectionId: 'answers', fieldId: 'notice_period_days' },
  },
  notice_period_days: {
    label: 'Add notice period',
    toastLabel: 'notice period',
    destination: { kind: 'section', sectionId: 'answers', fieldId: 'notice_period_days' },
  },
  requiresSponsorship: {
    label: 'Set sponsorship preference',
    toastLabel: 'sponsorship preference',
    destination: { kind: 'section', sectionId: 'work-auth', fieldId: 'requiresSponsorship' },
  },
  sponsorship_required: {
    label: 'Add sponsorship answer',
    toastLabel: 'sponsorship answer',
    destination: { kind: 'section', sectionId: 'work-auth', fieldId: 'sponsorship_required' },
  },
  resumeVersionId: {
    label: 'Approve a resume',
    toastLabel: 'approved resume',
    destination: { kind: 'section', sectionId: 'resumes', fieldId: 'defaultResume' },
  },
  resume: {
    label: 'Approve a resume',
    toastLabel: 'approved resume',
    destination: { kind: 'section', sectionId: 'resumes', fieldId: 'defaultResume' },
  },
  profile: {
    label: 'Complete profile',
    toastLabel: 'application profile',
    destination: { kind: 'section', sectionId: 'personal' },
  },
  willingToRelocate: {
    label: 'Set relocation preference',
    toastLabel: 'relocation preference',
    destination: { kind: 'section', sectionId: 'preferences', fieldId: 'willingToRelocate' },
  },
  name: {
    label: 'Update account name',
    toastLabel: 'name',
    destination: { kind: 'section', sectionId: 'personal', fieldId: 'name' },
  },
  email: {
    label: 'Update account email',
    toastLabel: 'email',
    destination: { kind: 'section', sectionId: 'personal', fieldId: 'email' },
  },
  phone: {
    label: 'Add phone number',
    toastLabel: 'phone number',
    destination: { kind: 'section', sectionId: 'personal', fieldId: 'phone' },
  },
  portfolioUrl: {
    label: 'Add portfolio link',
    toastLabel: 'portfolio link',
    destination: { kind: 'section', sectionId: 'links', fieldId: 'portfolio' },
  },
  portfolio: {
    label: 'Add portfolio link',
    toastLabel: 'portfolio link',
    destination: { kind: 'section', sectionId: 'links', fieldId: 'portfolio' },
  },
  currentWorkRegion: {
    label: 'Add work region',
    toastLabel: 'work region',
    destination: { kind: 'section', sectionId: 'personal', fieldId: 'currentLocation' },
  },
  current_work_region: {
    label: 'Add work region',
    toastLabel: 'work region',
    destination: { kind: 'section', sectionId: 'personal', fieldId: 'currentLocation' },
  },
  currentLocation: {
    label: 'Add current location',
    toastLabel: 'current location',
    destination: { kind: 'section', sectionId: 'personal', fieldId: 'currentLocation' },
  },
  currentCountry: {
    label: 'Add current country',
    toastLabel: 'current country',
    destination: { kind: 'section', sectionId: 'personal', fieldId: 'currentCountry' },
  },
  mobileDesignExperienceYears: {
    label: 'Add mobile design experience',
    toastLabel: 'mobile design experience',
    destination: { kind: 'section', sectionId: 'answers', fieldId: 'mobile_design_experience' },
  },
  mobile_design_experience: {
    label: 'Add mobile design experience',
    toastLabel: 'mobile design experience',
    destination: { kind: 'section', sectionId: 'answers', fieldId: 'mobile_design_experience' },
  },
  matchScore: {
    label: 'Open For You',
    toastLabel: 'match score',
    destination: { kind: 'route', href: ROUTES.FOR_YOU },
  },
  consent: {
    label: 'Review consents',
    toastLabel: 'resume usage consent',
    destination: { kind: 'section', sectionId: 'consents', fieldId: 'resume-usage' },
  },
  desiredRoles: {
    label: 'Add desired roles',
    toastLabel: 'desired roles',
    destination: { kind: 'section', sectionId: 'preferences', fieldId: 'desiredRoles' },
  },
  preferredLocations: {
    label: 'Add preferred locations',
    toastLabel: 'preferred locations',
    destination: { kind: 'section', sectionId: 'preferences', fieldId: 'preferredLocations' },
  },
  remotePreferences: {
    label: 'Select work mode preferences',
    toastLabel: 'work mode preferences',
    destination: { kind: 'section', sectionId: 'preferences', fieldId: 'remotePreferences' },
  },
  privacyAcknowledgement: {
    label: 'Acknowledge privacy policy',
    toastLabel: 'privacy policy acknowledgement',
    destination: { kind: 'section', sectionId: 'consents', fieldId: 'privacy-acknowledgement' },
  },
};

const CODE_FIX_MAP: Record<string, SectionFix> = {
  MATCH_SCORE_MISSING: {
    field: 'matchScore',
    label: 'Open For You',
    toastLabel: 'match score',
    destination: { kind: 'route', href: ROUTES.FOR_YOU },
  },
  MATCH_SCORE_BELOW_THRESHOLD: {
    field: 'matchScore',
    label: 'Adjust exclusions',
    toastLabel: 'match score threshold',
    destination: { kind: 'section', sectionId: 'exclusions' },
  },
  CONSENT_REQUIRED: {
    field: 'consent',
    label: 'Grant resume usage',
    toastLabel: 'resume usage consent',
    destination: { kind: 'section', sectionId: 'consents', fieldId: 'resume-usage' },
  },
  RESUME_MISSING: {
    field: 'resumeVersionId',
    label: 'Approve a resume',
    toastLabel: 'approved resume',
    destination: { kind: 'section', sectionId: 'resumes', fieldId: 'defaultResume' },
  },
  RESUME_INACTIVE: {
    field: 'resumeVersionId',
    label: 'Set a default resume',
    toastLabel: 'default resume',
    destination: { kind: 'section', sectionId: 'resumes', fieldId: 'defaultResume' },
  },
  WORK_AUTHORIZATION_MISSING: {
    field: 'workAuthorization',
    label: 'Add work authorization',
    toastLabel: 'work authorization',
    destination: { kind: 'section', sectionId: 'work-auth', fieldId: 'work_authorization' },
  },
  SPONSORSHIP_REQUIREMENT_MISSING: {
    field: 'requiresSponsorship',
    label: 'Confirm sponsorship requirement',
    toastLabel: 'sponsorship requirement',
    destination: { kind: 'section', sectionId: 'work-auth', fieldId: 'requiresSponsorship' },
  },
  NOTICE_PERIOD_MISSING: {
    field: 'noticePeriodDays',
    label: 'Add notice period',
    toastLabel: 'notice period',
    destination: { kind: 'section', sectionId: 'answers', fieldId: 'notice_period_days' },
  },
  EXPERIENCE_MISSING: {
    field: 'yearsOfExperience',
    label: 'Add years of experience',
    toastLabel: 'years of experience',
    destination: { kind: 'section', sectionId: 'answers', fieldId: 'years_of_experience' },
  },
  PROFILE_MISSING: {
    field: 'profile',
    label: 'Complete profile',
    toastLabel: 'application profile',
    destination: { kind: 'section', sectionId: 'personal' },
  },
  CONTACT_NAME_MISSING: {
    field: 'name',
    label: 'Add your name',
    toastLabel: 'name',
    destination: { kind: 'section', sectionId: 'personal', fieldId: 'name' },
  },
  CONTACT_EMAIL_MISSING: {
    field: 'email',
    label: 'Verify your email',
    toastLabel: 'email',
    destination: { kind: 'section', sectionId: 'personal', fieldId: 'email' },
  },
  WORK_REGION_VERIFICATION_REQUIRED: {
    field: 'currentWorkRegion',
    label: 'Add work region',
    toastLabel: 'work region',
    destination: { kind: 'section', sectionId: 'personal', fieldId: 'currentLocation' },
  },
  JOB_LOCATION_REQUIREMENT_NOT_MET: {
    field: 'currentWorkRegion',
    label: 'Review work region',
    toastLabel: 'work region',
    destination: { kind: 'section', sectionId: 'personal', fieldId: 'currentLocation' },
  },
  EXPERIENCE_REQUIREMENT_UNKNOWN: {
    field: 'yearsOfExperience',
    label: 'Add years of experience',
    toastLabel: 'years of experience',
    destination: { kind: 'section', sectionId: 'answers', fieldId: 'years_of_experience' },
  },
  MOBILE_DESIGN_EVIDENCE_REQUIRED: {
    field: 'mobileDesignExperienceYears',
    label: 'Add mobile design experience',
    toastLabel: 'mobile design experience',
    destination: { kind: 'section', sectionId: 'answers', fieldId: 'mobile_design_experience' },
  },
  PORTFOLIO_EVIDENCE_REQUIRED: {
    field: 'portfolio',
    label: 'Add portfolio link',
    toastLabel: 'portfolio link',
    destination: { kind: 'section', sectionId: 'links', fieldId: 'portfolio' },
  },
  ANALYSIS_STALE: {
    field: 'analysis',
    label: 'Re-prepare application',
    toastLabel: 'application analysis',
    destination: { kind: 'tab', tab: 'submissions' },
  },
  RESUME_USAGE_CONSENT: {
    field: 'consent',
    label: 'Grant resume usage',
    toastLabel: 'resume usage consent',
    destination: { kind: 'section', sectionId: 'consents', fieldId: 'resume-usage' },
  },
  APPROVED_RESUME: {
    field: 'resumeVersionId',
    label: 'Approve a resume',
    toastLabel: 'approved resume',
    destination: { kind: 'section', sectionId: 'resumes', fieldId: 'defaultResume' },
  },
  PRIVACY_ACKNOWLEDGEMENT: {
    field: 'privacyAcknowledgement',
    label: 'Acknowledge privacy policy',
    toastLabel: 'privacy policy acknowledgement',
    destination: { kind: 'section', sectionId: 'consents', fieldId: 'privacy-acknowledgement' },
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

export function buildSetupGapToastMessage(actions: MissingFieldFixAction[]): string {
  if (actions.length === 0) {
    return 'Finish Application Setup to continue.';
  }

  const first = actions[0]!;
  const gapLabel = first.toastLabel ?? first.label.toLowerCase();

  if (actions.length === 1) {
    return `Add your ${gapLabel} to continue.`;
  }

  return `${actions.length} things needed to continue — starting with your ${gapLabel}.`;
}

export function destinationToSetupHref(destination: FixDestination): string | null {
  if (destination.kind === 'route') return destination.href;
  if (destination.kind === 'section') {
    const params = new URLSearchParams({ section: destination.sectionId });
    if (destination.fieldId) params.set('field', destination.fieldId);
    return `${ROUTES.AUTO_APPLY}?${params.toString()}`;
  }
  const params = new URLSearchParams({ tab: destination.tab });
  if (destination.fieldId) params.set('field', destination.fieldId);
  return `${ROUTES.AUTO_APPLY}?${params.toString()}`;
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
        toastLabel: field.replace(/_/g, ' '),
        destination: { kind: 'section', sectionId: 'answers', fieldId: field },
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
      toastLabel: reason.field?.replace(/_/g, ' ') ?? 'setup details',
      destination: { kind: 'section', sectionId: 'answers', fieldId: reason.field },
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

export function resolveSetupGapFixActions(
  gaps: Array<{ code: string; label: string; section: SetupSectionId }>,
): MissingFieldFixAction[] {
  return gaps.map((gap) => {
    const mapped = CODE_FIX_MAP[gap.code];
    if (mapped) {
      return { id: gap.code, message: gap.label, ...mapped };
    }
    return {
      id: gap.code,
      label: gap.label,
      toastLabel: gap.label.toLowerCase(),
      destination: { kind: 'section', sectionId: gap.section },
      message: gap.label,
    };
  });
}
