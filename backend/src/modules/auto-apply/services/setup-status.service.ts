import { ICandidateApplicationProfileRepository } from '@/modules/auto-apply/contracts/candidate-profile.contract.js';
import { IApplicationAnswerRepository } from '@/modules/auto-apply/contracts/application-answer.contract.js';
import { IApprovedResumeVersionRepository } from '@/modules/auto-apply/contracts/resume-version.contract.js';
import { IApplicationConsentRepository } from '@/modules/auto-apply/contracts/application-consent.contract.js';
import {
  IApplicationReadinessService,
  IUserContactLookup,
} from '@/modules/auto-apply/contracts/application-readiness.contract.js';
import { READINESS_REASON_CODES } from '@/modules/auto-apply/constants/readiness-reason-codes.js';
import {
  SetupGap,
  SetupGapCode,
  SetupSectionId,
  SetupSectionStatus,
  SetupStatusResult,
} from '@/modules/auto-apply/types/setup-status.types.js';
import { hasPrivacyAcknowledgement } from '@/modules/auto-apply/services/privacy-acknowledgement.service.js';
import type { CandidateApplicationProfileDto } from '@/modules/auto-apply/types/candidate-profile.types.js';
import type { ApplicationAnswerDto } from '@/modules/auto-apply/types/application-answer.types.js';

const SECTION_DEFINITIONS: Array<{
  id: SetupSectionId;
  label: string;
  required: boolean;
}> = [
  { id: 'personal', label: 'Personal & contact details', required: true },
  { id: 'work-auth', label: 'Work authorization & sponsorship', required: true },
  { id: 'preferences', label: 'Job preferences', required: true },
  { id: 'links', label: 'Professional links', required: false },
  { id: 'answers', label: 'Common answers', required: true },
  { id: 'resumes', label: 'Resume', required: true },
  { id: 'education', label: 'Education', required: false },
  { id: 'consents', label: 'Consent & privacy', required: true },
];

const READINESS_GAP_BY_CODE: Partial<
  Record<string, { code: SetupGapCode; label: string; section: SetupSectionId }>
> = {
  [READINESS_REASON_CODES.CONTACT_NAME_MISSING]: {
    code: 'CONTACT_NAME_MISSING',
    label: 'Add your first and last name',
    section: 'personal',
  },
  [READINESS_REASON_CODES.CONTACT_EMAIL_MISSING]: {
    code: 'CONTACT_EMAIL_MISSING',
    label: 'Verify your account email',
    section: 'personal',
  },
  [READINESS_REASON_CODES.PROFILE_MISSING]: {
    code: 'PROFILE_MISSING',
    label: 'Create your application profile',
    section: 'personal',
  },
  [READINESS_REASON_CODES.WORK_AUTHORIZATION_MISSING]: {
    code: 'WORK_AUTHORIZATION_MISSING',
    label: 'Verify your work authorization',
    section: 'work-auth',
  },
  [READINESS_REASON_CODES.SPONSORSHIP_REQUIREMENT_MISSING]: {
    code: 'SPONSORSHIP_REQUIREMENT_MISSING',
    label: 'Confirm whether you require employer sponsorship',
    section: 'work-auth',
  },
  [READINESS_REASON_CODES.NOTICE_PERIOD_MISSING]: {
    code: 'NOTICE_PERIOD_MISSING',
    label: 'Set notice period (or mark Immediate joiner)',
    section: 'answers',
  },
  [READINESS_REASON_CODES.EXPERIENCE_MISSING]: {
    code: 'EXPERIENCE_MISSING',
    label: 'Verify your years of experience',
    section: 'answers',
  },
  [READINESS_REASON_CODES.RESUME_MISSING]: {
    code: 'APPROVED_RESUME',
    label: 'Approve at least one resume',
    section: 'resumes',
  },
};

function isVerifiedAnswer(answer: ApplicationAnswerDto | undefined): boolean {
  return Boolean(answer?.answer.trim() && answer.source === 'USER_VERIFIED');
}

function collectPreferenceGaps(profile: CandidateApplicationProfileDto | null): SetupGap[] {
  const gaps: SetupGap[] = [];
  const prefs = profile?.preferences;

  if (!prefs?.desiredRoles?.length) {
    gaps.push({
      code: 'DESIRED_ROLES',
      label: 'Add at least one desired role',
      section: 'preferences',
    });
  }
  if (!prefs?.preferredLocations?.length) {
    gaps.push({
      code: 'PREFERRED_LOCATIONS',
      label: 'Add at least one preferred location',
      section: 'preferences',
    });
  }
  if (!prefs?.remotePreferences?.length && !prefs?.remotePreference) {
    gaps.push({
      code: 'REMOTE_PREFERENCES',
      label: 'Select remote / hybrid / on-site preferences',
      section: 'preferences',
    });
  }
  if (!prefs?.expectedSalary?.currency) {
    gaps.push({
      code: 'SALARY_CURRENCY',
      label: 'Choose a salary currency',
      section: 'preferences',
    });
  }

  return gaps;
}

function isPersonalComplete(
  contact: Awaited<ReturnType<IUserContactLookup['findByUserId']>>,
  profile: CandidateApplicationProfileDto | null,
): boolean {
  const prefs = profile?.preferences;
  return Boolean(
    profile &&
    contact?.firstName?.trim() &&
    contact?.lastName?.trim() &&
    contact?.email?.trim() &&
    prefs?.currentLocation?.trim() &&
    prefs?.currentCountry?.trim(),
  );
}

function isWorkAuthComplete(
  profile: CandidateApplicationProfileDto | null,
  answerByKey: Map<string, ApplicationAnswerDto>,
): boolean {
  const workAuth = answerByKey.get('work_authorization');
  const sponsorshipAnswer = answerByKey.get('sponsorship_required');
  const requiresSponsorship = profile?.preferences.requiresSponsorship;
  const sponsorshipDeclared =
    requiresSponsorship !== undefined || Boolean(sponsorshipAnswer?.answer.trim());

  return isVerifiedAnswer(workAuth) && sponsorshipDeclared;
}

function isPreferencesComplete(profile: CandidateApplicationProfileDto | null): boolean {
  return collectPreferenceGaps(profile).length === 0;
}

function isLinksComplete(profile: CandidateApplicationProfileDto | null): boolean {
  const links = profile?.links;
  return Boolean(links?.linkedin?.trim() || links?.github?.trim() || links?.portfolio?.trim());
}

function isAnswersComplete(
  profile: CandidateApplicationProfileDto | null,
  answerByKey: Map<string, ApplicationAnswerDto>,
): boolean {
  const noticeFromProfile =
    profile?.preferences.noticePeriodDays !== undefined &&
    profile?.preferences.noticePeriodDays !== null;
  const noticeComplete =
    noticeFromProfile || isVerifiedAnswer(answerByKey.get('notice_period_days'));

  return noticeComplete && Boolean(answerByKey.get('years_of_experience')?.answer.trim());
}

function isResumesComplete(hasActiveResume: boolean): boolean {
  return hasActiveResume;
}

function isEducationComplete(): boolean {
  return true;
}

function isConsentsComplete(hasResumeConsent: boolean, hasPrivacyAck: boolean): boolean {
  return hasResumeConsent && hasPrivacyAck;
}

export class SetupStatusService {
  constructor(
    private readonly readinessService: IApplicationReadinessService,
    private readonly profileRepository: ICandidateApplicationProfileRepository,
    private readonly answerRepository: IApplicationAnswerRepository,
    private readonly resumeVersionRepository: IApprovedResumeVersionRepository,
    private readonly consentRepository: IApplicationConsentRepository,
    private readonly userContactLookup: IUserContactLookup,
  ) {}

  async getSetupStatus(userId: string): Promise<SetupStatusResult> {
    const [profile, answers, resumes, consent, contact, readiness] = await Promise.all([
      this.profileRepository.findByUserId(userId),
      this.answerRepository.findManyByUserId(userId),
      this.resumeVersionRepository.findManyByUserId(userId),
      this.consentRepository.findActiveByType(userId, 'RESUME_USAGE'),
      this.userContactLookup.findByUserId(userId),
      this.readinessService.evaluateSetupCompleteness(userId),
    ]);

    const answerByKey = new Map(answers.map((answer) => [answer.questionKey, answer]));
    const hasActiveResume = resumes.some((resume) => resume.isActive);
    const hasResumeConsent = Boolean(consent);
    const hasPrivacyAck = hasPrivacyAcknowledgement(profile?.verification);

    const gaps: SetupGap[] = [];

    for (const reason of readiness.blockingReasons) {
      const mapped = READINESS_GAP_BY_CODE[reason.code];
      if (mapped) {
        gaps.push(mapped);
      }
    }

    gaps.push(...collectPreferenceGaps(profile));

    if (!hasActiveResume && !gaps.some((gap) => gap.code === 'APPROVED_RESUME')) {
      gaps.push({
        code: 'APPROVED_RESUME',
        label: 'Approve at least one resume',
        section: 'resumes',
      });
    }

    if (!hasResumeConsent) {
      gaps.push({
        code: 'RESUME_USAGE_CONSENT',
        label: 'Allow using your approved resume for applications',
        section: 'consents',
      });
    }

    if (!hasPrivacyAck) {
      gaps.push({
        code: 'PRIVACY_ACKNOWLEDGEMENT',
        label: 'Acknowledge the privacy policy',
        section: 'consents',
      });
    }

    const sectionCompletion: Record<SetupSectionId, boolean> = {
      personal: isPersonalComplete(contact, profile),
      'work-auth': isWorkAuthComplete(profile, answerByKey),
      preferences: isPreferencesComplete(profile),
      links: isLinksComplete(profile),
      answers: isAnswersComplete(profile, answerByKey),
      resumes: isResumesComplete(hasActiveResume),
      education: isEducationComplete(),
      consents: isConsentsComplete(hasResumeConsent, hasPrivacyAck),
    };

    for (const gap of gaps) {
      sectionCompletion[gap.section] = false;
    }

    const sections: SetupSectionStatus[] = SECTION_DEFINITIONS.map((definition) => ({
      id: definition.id,
      label: definition.label,
      required: definition.required,
      complete: sectionCompletion[definition.id],
    }));

    const requiredSections = sections.filter((section) => section.required);
    const requiredCompleteCount = requiredSections.filter((section) => section.complete).length;
    const percent =
      requiredSections.length === 0
        ? 100
        : Math.round((requiredCompleteCount / requiredSections.length) * 100);
    const complete = requiredSections.every((section) => section.complete);

    return {
      complete,
      percent,
      readyForAssistedApply: readiness.ready && complete,
      gaps,
      sections,
    };
  }
}
