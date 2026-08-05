import type {
  ApplicationConsentDto,
  ApprovedResumeVersionDto,
  CandidateApplicationProfileDto,
  WorkModePreference,
} from '@/features/auto-apply/types/autoApply.types';

export const SALARY_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'INR',
  'CAD',
  'AUD',
  'SGD',
  'JPY',
  'AED',
  'CHF',
] as const;

export type SalaryCurrency = (typeof SALARY_CURRENCIES)[number];

export const WORK_MODE_OPTIONS: { label: string; value: WorkModePreference }[] = [
  { label: 'Remote', value: 'REMOTE' },
  { label: 'Hybrid', value: 'HYBRID' },
  { label: 'On-site', value: 'ONSITE' },
];

export type SetupGapCode =
  | 'DESIRED_ROLES'
  | 'PREFERRED_LOCATIONS'
  | 'REMOTE_PREFERENCES'
  | 'SALARY_CURRENCY'
  | 'NOTICE_PERIOD'
  | 'APPROVED_RESUME'
  | 'RESUME_USAGE_CONSENT';

export interface SetupGap {
  code: SetupGapCode;
  label: string;
  tab: 'profile' | 'resumes' | 'consents';
}

export function resolveRemotePreferences(
  preferences: CandidateApplicationProfileDto['preferences'] | undefined,
): WorkModePreference[] {
  if (!preferences) return [];
  if (preferences.remotePreferences?.length) {
    return preferences.remotePreferences;
  }
  const legacy = preferences.remotePreference;
  if (!legacy || legacy === 'ANY') {
    return ['REMOTE', 'HYBRID', 'ONSITE'];
  }
  return [legacy];
}

/** Required setup before Assisted Apply / tracking / approve can proceed. */
export function getAutoApplySetupGaps(input: {
  profile: CandidateApplicationProfileDto | null | undefined;
  resumes: ApprovedResumeVersionDto[] | null | undefined;
  consents: ApplicationConsentDto[] | null | undefined;
}): SetupGap[] {
  const gaps: SetupGap[] = [];
  const prefs = input.profile?.preferences;

  if (!prefs?.desiredRoles?.length) {
    gaps.push({
      code: 'DESIRED_ROLES',
      label: 'Add at least one desired role',
      tab: 'profile',
    });
  }
  if (!prefs?.preferredLocations?.length) {
    gaps.push({
      code: 'PREFERRED_LOCATIONS',
      label: 'Add at least one preferred location',
      tab: 'profile',
    });
  }
  if (!prefs?.remotePreferences?.length) {
    gaps.push({
      code: 'REMOTE_PREFERENCES',
      label: 'Select remote / hybrid / on-site preferences',
      tab: 'profile',
    });
  }
  if (!prefs?.expectedSalary?.currency) {
    gaps.push({
      code: 'SALARY_CURRENCY',
      label: 'Choose a salary currency',
      tab: 'profile',
    });
  }
  if (prefs?.noticePeriodDays === undefined || prefs.noticePeriodDays === null) {
    gaps.push({
      code: 'NOTICE_PERIOD',
      label: 'Set notice period (or mark Immediate joiner)',
      tab: 'profile',
    });
  }

  const hasActiveResume = (input.resumes ?? []).some((resume) => resume.isActive);
  if (!hasActiveResume) {
    gaps.push({
      code: 'APPROVED_RESUME',
      label: 'Approve at least one resume',
      tab: 'resumes',
    });
  }

  const hasResumeConsent = (input.consents ?? []).some(
    (consent) => consent.consentType === 'RESUME_USAGE' && !consent.revokedAt,
  );
  if (!hasResumeConsent) {
    gaps.push({
      code: 'RESUME_USAGE_CONSENT',
      label: 'Allow using your approved resume for applications',
      tab: 'consents',
    });
  }

  return gaps;
}

export function isAutoApplySetupComplete(input: {
  profile: CandidateApplicationProfileDto | null | undefined;
  resumes: ApprovedResumeVersionDto[] | null | undefined;
  consents: ApplicationConsentDto[] | null | undefined;
}): boolean {
  return getAutoApplySetupGaps(input).length === 0;
}
