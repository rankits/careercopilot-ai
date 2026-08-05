import { AppError } from '@/shared/utils/errors/AppError.js';
import { ICandidateApplicationProfileRepository } from '@/modules/auto-apply/contracts/candidate-profile.contract.js';
import { IApplicationRuleRepository } from '@/modules/auto-apply/contracts/application-rule.contract.js';
import { IApplicationAnswerRepository } from '@/modules/auto-apply/contracts/application-answer.contract.js';
import { IApprovedResumeVersionRepository } from '@/modules/auto-apply/contracts/resume-version.contract.js';
import { IApplicationConsentRepository } from '@/modules/auto-apply/contracts/application-consent.contract.js';
import {
  IChannelDetectionJobLookup,
  IChannelDetectionService,
} from '@/modules/auto-apply/contracts/channel-detection.contract.js';
import {
  IJobEligibilityLookup,
  IEligibilityService,
} from '@/modules/auto-apply/contracts/eligibility.contract.js';
import { IJobApplicationRepository } from '@/modules/auto-apply/contracts/job-application.contract.js';
import {
  IApplicationReadinessService,
  IFeatureFlagLookup,
  IMatchScoreLookup,
  ITrackerDuplicateLookup,
  IUserContactLookup,
} from '@/modules/auto-apply/contracts/application-readiness.contract.js';
import { IJobApplicationAdapterRegistry } from '@/modules/auto-apply/contracts/adapter.contract.js';
import { stageSeverity } from '@/modules/auto-apply/constants/readiness-stage-policy.js';
import { READINESS_REASON_CODES } from '@/modules/auto-apply/constants/readiness-reason-codes.js';
import { DEFAULT_APPLICATION_RULE } from '@/modules/auto-apply/types/application-rule.types.js';
import {
  ApplicationReadinessDecision,
  ApplicationReadinessInput,
  ApplicationReadinessReason,
  ApplicationReadinessResult,
  ApplicationReadinessRuleResult,
  ApplicationReadinessStage,
  CONSUMED_APPLICATION_STATUSES,
} from '@/modules/auto-apply/types/application-readiness.types.js';

const BASELINE_REQUIRED_ANSWER_KEYS = ['work_authorization', 'notice_period_days'] as const;

/**
 * Authoritative Application Readiness and Policy Enforcement Gate.
 * Single source of truth for PLAN / APPROVE / QUEUE / SUBMIT safety checks.
 * Fail-closed for mandatory unknowns (work auth, sponsorship, experience).
 */
export class ApplicationReadinessService implements IApplicationReadinessService {
  constructor(
    private readonly featureFlags: IFeatureFlagLookup,
    private readonly jobLookup: IJobEligibilityLookup,
    private readonly channelJobLookup: IChannelDetectionJobLookup,
    private readonly channelDetectionService: IChannelDetectionService,
    private readonly adapterRegistry: IJobApplicationAdapterRegistry,
    private readonly profileRepository: ICandidateApplicationProfileRepository,
    private readonly answerRepository: IApplicationAnswerRepository,
    private readonly resumeVersionRepository: IApprovedResumeVersionRepository,
    private readonly ruleRepository: IApplicationRuleRepository,
    private readonly consentRepository: IApplicationConsentRepository,
    private readonly jobApplicationRepository: IJobApplicationRepository,
    private readonly userContactLookup: IUserContactLookup,
    private readonly matchScoreLookup: IMatchScoreLookup,
    private readonly trackerDuplicateLookup: ITrackerDuplicateLookup,
    private readonly eligibilityService: IEligibilityService,
  ) {}

  async evaluate(input: ApplicationReadinessInput): Promise<ApplicationReadinessResult> {
    const { userId, jobId, stage } = input;
    const blockingReasons: ApplicationReadinessReason[] = [];
    const warnings: ApplicationReadinessReason[] = [];
    const evaluatedRules: Record<string, ApplicationReadinessRuleResult> = {};
    const evaluatedAt = new Date();

    const push = (
      check: Parameters<typeof stageSeverity>[0],
      reason: ApplicationReadinessReason,
      ruleStatus: ApplicationReadinessRuleResult['status'],
      details?: Record<string, unknown>,
    ) => {
      evaluatedRules[check] = { status: ruleStatus, ...(details ? { details } : {}) };
      const severity = stageSeverity(check, stage);
      if (severity === 'SKIP') return;
      if (severity === 'WARNING') {
        warnings.push({ ...reason, severity: 'WARNING' });
        return;
      }
      if (ruleStatus === 'FAILED') {
        blockingReasons.push({ ...reason, severity: 'BLOCKING' });
      }
    };

    if (!this.featureFlags.isAutoApplyEnabled()) {
      push(
        'featureEnabled',
        {
          code: READINESS_REASON_CODES.FEATURE_DISABLED,
          message: 'Auto Apply is currently disabled by configuration.',
          rule: 'featureEnabled',
          severity: 'BLOCKING',
        },
        'FAILED',
      );
      return this.finalize(
        'FEATURE_DISABLED',
        blockingReasons,
        warnings,
        evaluatedRules,
        evaluatedAt,
      );
    }
    evaluatedRules.featureEnabled = { status: 'PASSED' };

    const resolvedRule = (await this.ruleRepository.findByUserId(userId)) ?? {
      ...DEFAULT_APPLICATION_RULE,
    };

    if (resolvedRule.autopilotPausedAt) {
      push(
        'pauseStatus',
        {
          code: READINESS_REASON_CODES.AUTO_APPLY_PAUSED,
          message: 'Auto Apply is paused for this account.',
          rule: 'pauseStatus',
          severity: 'BLOCKING',
        },
        'FAILED',
        { pausedAt: resolvedRule.autopilotPausedAt.toISOString() },
      );
    } else {
      evaluatedRules.pauseStatus = { status: 'PASSED' };
    }

    const job = await this.jobLookup.findJobSnapshot(jobId);
    const channelJob = await this.channelJobLookup.findJobChannelSnapshot(jobId);
    const channelResult = await this.channelDetectionService.detectChannel(jobId);

    if (!job) {
      push(
        'jobAvailable',
        {
          code: READINESS_REASON_CODES.JOB_NOT_FOUND,
          message: 'The target job could not be found.',
          rule: 'jobAvailable',
          severity: 'BLOCKING',
        },
        'FAILED',
      );
      return this.finalize(
        'JOB_UNAVAILABLE',
        blockingReasons,
        warnings,
        evaluatedRules,
        evaluatedAt,
      );
    }

    if (job.status !== 'ACTIVE') {
      push(
        'jobAvailable',
        {
          code: READINESS_REASON_CODES.JOB_NOT_ACTIVE,
          message: `Job status is ${job.status}, not ACTIVE.`,
          rule: 'jobAvailable',
          severity: 'BLOCKING',
        },
        'FAILED',
        { status: job.status },
      );
    } else if (!channelJob?.applyUrl) {
      push(
        'jobAvailable',
        {
          code: READINESS_REASON_CODES.APPLY_URL_MISSING,
          message: 'No validated external apply URL is available for this job.',
          rule: 'jobAvailable',
          severity: 'BLOCKING',
        },
        'FAILED',
      );
    } else {
      evaluatedRules.jobAvailable = { status: 'PASSED' };
    }

    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) {
      push(
        'profileComplete',
        {
          code: READINESS_REASON_CODES.PROFILE_MISSING,
          message: 'Candidate application profile has not been set up.',
          field: 'profile',
          rule: 'profileComplete',
          severity: 'BLOCKING',
          collectionMode: 'ONBOARDING',
        },
        'FAILED',
      );
    } else {
      evaluatedRules.profileComplete = { status: 'PASSED' };
    }

    const contact = await this.userContactLookup.findByUserId(userId);
    if (!contact?.firstName?.trim() || !contact?.lastName?.trim()) {
      push(
        'contactIdentity',
        {
          code: READINESS_REASON_CODES.CONTACT_NAME_MISSING,
          message: 'First and last name are required before applying.',
          field: 'name',
          rule: 'contactIdentity',
          severity: 'BLOCKING',
          collectionMode: 'ONBOARDING',
        },
        'FAILED',
      );
    } else if (!contact.email?.trim()) {
      push(
        'contactIdentity',
        {
          code: READINESS_REASON_CODES.CONTACT_EMAIL_MISSING,
          message: 'A verified account email is required before applying.',
          field: 'email',
          rule: 'contactIdentity',
          severity: 'BLOCKING',
          collectionMode: 'ONBOARDING',
        },
        'FAILED',
      );
    } else {
      evaluatedRules.contactIdentity = { status: 'PASSED' };
    }

    const answers = await this.answerRepository.findManyByUserId(userId);
    const answerByKey = new Map(answers.map((a) => [a.questionKey, a]));

    const missingBaseline = BASELINE_REQUIRED_ANSWER_KEYS.filter((key) => {
      const answer = answerByKey.get(key);
      return !answer || !answer.answer.trim() || answer.source !== 'USER_VERIFIED';
    });

    if (missingBaseline.includes('work_authorization')) {
      push(
        'workAuthorization',
        {
          code: READINESS_REASON_CODES.WORK_AUTHORIZATION_MISSING,
          message: 'Work authorization must be verified before this application can continue.',
          field: 'workAuthorization',
          rule: 'workAuthorization',
          severity: 'BLOCKING',
          collectionMode: 'PROGRESSIVE',
        },
        'FAILED',
      );
    } else {
      evaluatedRules.workAuthorization = {
        status: 'PASSED',
        details: { note: 'Candidate answer verified; job has no structured auth requirement' },
      };
    }

    if (missingBaseline.includes('notice_period_days')) {
      push(
        'verifiedAnswers',
        {
          code: READINESS_REASON_CODES.NOTICE_PERIOD_MISSING,
          message: 'Notice period must be verified before this application can continue.',
          field: 'noticePeriodDays',
          rule: 'verifiedAnswers',
          severity: 'BLOCKING',
          collectionMode: 'ONBOARDING',
        },
        'FAILED',
      );
    } else {
      evaluatedRules.verifiedAnswers = { status: 'PASSED' };
    }

    const sponsorshipAnswer = answerByKey.get('sponsorship_required');
    const requiresSponsorship = profile?.preferences.requiresSponsorship;
    if (requiresSponsorship === undefined && !sponsorshipAnswer?.answer.trim()) {
      push(
        'sponsorship',
        {
          code: READINESS_REASON_CODES.SPONSORSHIP_REQUIREMENT_MISSING,
          message: 'Confirm whether you require employer sponsorship.',
          field: 'requiresSponsorship',
          rule: 'sponsorship',
          severity: 'BLOCKING',
          collectionMode: 'PROGRESSIVE',
        },
        'FAILED',
      );
    } else if (
      requiresSponsorship === true ||
      sponsorshipAnswer?.answer.trim().toLowerCase() === 'yes'
    ) {
      push(
        'sponsorship',
        {
          code: READINESS_REASON_CODES.SPONSORSHIP_UNKNOWN_COMPATIBILITY,
          message:
            'You require sponsorship, but this job does not declare sponsorship availability. Confirm before continuing.',
          field: 'requiresSponsorship',
          rule: 'sponsorship',
          severity: 'BLOCKING',
          collectionMode: 'JOB_SPECIFIC',
        },
        'FAILED',
      );
    } else {
      evaluatedRules.sponsorship = { status: 'PASSED' };
    }

    const experienceAnswer = answerByKey.get('years_of_experience');
    if (!experienceAnswer?.answer.trim()) {
      push(
        'experience',
        {
          code: READINESS_REASON_CODES.EXPERIENCE_MISSING,
          message: 'Years of experience must be verified before this application can continue.',
          field: 'yearsOfExperience',
          rule: 'experience',
          severity: 'BLOCKING',
          collectionMode: 'PROGRESSIVE',
        },
        'FAILED',
      );
    } else {
      evaluatedRules.experience = {
        status: 'PASSED',
        details: { note: 'Candidate experience verified; job has no structured experience range' },
      };
    }

    if (profile) {
      const remotePreference = profile.preferences.remotePreference;
      if (
        remotePreference &&
        remotePreference !== 'ANY' &&
        job.remoteType &&
        job.remoteType.toUpperCase() !== remotePreference
      ) {
        if (profile.preferences.willingToRelocate === undefined) {
          push(
            'locationRemote',
            {
              code: READINESS_REASON_CODES.RELOCATION_PREFERENCE_MISSING,
              message:
                'Remote preference does not match this job. Confirm whether you are willing to relocate.',
              field: 'willingToRelocate',
              rule: 'locationRemote',
              severity: 'BLOCKING',
              collectionMode: 'PROGRESSIVE',
            },
            'FAILED',
          );
        } else if (!profile.preferences.willingToRelocate) {
          push(
            'locationRemote',
            {
              code: READINESS_REASON_CODES.REMOTE_INCOMPATIBLE,
              message: `Candidate requires ${remotePreference}, job is ${job.remoteType}, and relocation is declined.`,
              rule: 'locationRemote',
              severity: 'BLOCKING',
            },
            'FAILED',
          );
        } else {
          evaluatedRules.locationRemote = { status: 'PASSED' };
        }
      } else {
        evaluatedRules.locationRemote = { status: 'PASSED' };
      }
    }

    const eligibility = await this.eligibilityService.evaluateForJob(userId, jobId);
    const hardFailures = eligibility.checks.filter((c) => c.status === 'FAILED');
    if (hardFailures.length > 0) {
      for (const failure of hardFailures) {
        const code =
          failure.check === 'COMPANY_BLACKLIST'
            ? READINESS_REASON_CODES.COMPANY_BLACKLISTED
            : failure.check === 'TITLE_EXCLUSION'
              ? READINESS_REASON_CODES.TITLE_EXCLUDED
              : failure.check === 'SOURCE_EXCLUSION'
                ? READINESS_REASON_CODES.SOURCE_EXCLUDED
                : failure.check === 'SALARY_FLOOR'
                  ? READINESS_REASON_CODES.SALARY_INCOMPATIBLE
                  : failure.check === 'REMOTE_PREFERENCE'
                    ? READINESS_REASON_CODES.REMOTE_INCOMPATIBLE
                    : failure.check === 'PROFILE_COMPLETE'
                      ? READINESS_REASON_CODES.PROFILE_MISSING
                      : failure.check === 'JOB_ACTIVE'
                        ? READINESS_REASON_CODES.JOB_NOT_ACTIVE
                        : failure.check;
        push(
          'eligibilityHardRules',
          {
            code,
            message: failure.reason ?? `${failure.check} failed`,
            rule: failure.check,
            severity: 'BLOCKING',
          },
          'FAILED',
          { check: failure.check },
        );
      }
    } else {
      evaluatedRules.eligibilityHardRules = { status: 'PASSED' };
    }

    const versions = await this.resumeVersionRepository.findManyByUserId(userId);
    const activeResume = versions.find((v) => v.isActive) ?? null;
    let plannedResumeId: string | null = null;
    let applicationMatchScore: number | null = null;
    let applicationStatus: string | null = null;
    if (input.jobApplicationId) {
      const application = await this.jobApplicationRepository.findById(
        userId,
        input.jobApplicationId,
      );
      plannedResumeId = application?.resumeVersionId ?? null;
      applicationMatchScore = application?.matchScore ?? null;
      applicationStatus = application?.status ?? null;
    }

    if (!activeResume) {
      push(
        'resumeApproved',
        {
          code: READINESS_REASON_CODES.RESUME_MISSING,
          message: 'An approved active resume version is required.',
          field: 'resumeVersionId',
          rule: 'resumeApproved',
          severity: 'BLOCKING',
          collectionMode: 'ONBOARDING',
        },
        'FAILED',
      );
    } else if (plannedResumeId) {
      const planned = versions.find((v) => v.id === plannedResumeId);
      if (!planned || !planned.isActive) {
        push(
          'resumeApproved',
          {
            code: READINESS_REASON_CODES.RESUME_INACTIVE,
            message: 'The planned resume version is missing or no longer active.',
            field: 'resumeVersionId',
            rule: 'resumeApproved',
            severity: 'BLOCKING',
            collectionMode: 'ONBOARDING',
          },
          'FAILED',
        );
      } else {
        evaluatedRules.resumeApproved = {
          status: 'PASSED',
          details: { resumeVersionId: planned.id },
        };
      }
    } else {
      evaluatedRules.resumeApproved = {
        status: 'PASSED',
        details: { resumeVersionId: activeResume.id },
      };
    }

    let matchScore = applicationMatchScore;
    if (matchScore == null) {
      matchScore = await this.matchScoreLookup.findOverallScore(userId, jobId);
      if (matchScore != null && input.jobApplicationId) {
        await this.jobApplicationRepository.updateMatchScore(
          userId,
          input.jobApplicationId,
          matchScore,
        );
      }
    }
    const minMatchScore = resolvedRule.minMatchScore;
    if (matchScore == null) {
      push(
        'matchScorePresence',
        {
          code: READINESS_REASON_CODES.MATCH_SCORE_MISSING,
          message:
            'No match score yet for this job. Open For You (or run recommendations) so a trusted score can be attached — planning can continue without it for now.',
          field: 'matchScore',
          rule: 'matchScorePresence',
          severity: 'BLOCKING',
          collectionMode: 'JOB_SPECIFIC',
        },
        'FAILED',
        { required: minMatchScore },
      );
    } else if (matchScore < minMatchScore) {
      push(
        'matchScore',
        {
          code: READINESS_REASON_CODES.MATCH_SCORE_BELOW_THRESHOLD,
          message: `Match score ${matchScore} is below the configured minimum ${minMatchScore}.`,
          field: 'matchScore',
          rule: 'matchScore',
          severity: 'BLOCKING',
          collectionMode: 'JOB_SPECIFIC',
        },
        'FAILED',
        { required: minMatchScore, actual: matchScore },
      );
    } else {
      evaluatedRules.matchScore = {
        status: 'PASSED',
        details: { required: minMatchScore, actual: matchScore },
      };
      evaluatedRules.matchScorePresence = { status: 'PASSED' };
    }

    const now = evaluatedAt;
    const startOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setUTCDate(startOfWeek.getUTCDate() - startOfWeek.getUTCDay());

    const dailyUsed = await this.jobApplicationRepository.countConsumedSince(userId, startOfDay);
    const weeklyUsed = await this.jobApplicationRepository.countConsumedSince(userId, startOfWeek);
    const currentConsumes =
      !!applicationStatus &&
      (CONSUMED_APPLICATION_STATUSES as readonly string[]).includes(applicationStatus);
    const dailyEffective = currentConsumes ? Math.max(0, dailyUsed - 1) : dailyUsed;
    const weeklyEffective = currentConsumes ? Math.max(0, weeklyUsed - 1) : weeklyUsed;

    if (dailyEffective >= resolvedRule.dailyApplicationLimit) {
      push(
        'dailyLimit',
        {
          code: READINESS_REASON_CODES.DAILY_LIMIT_REACHED,
          message: `Daily application limit of ${resolvedRule.dailyApplicationLimit} has been reached.`,
          rule: 'dailyLimit',
          severity: 'BLOCKING',
        },
        'FAILED',
        {
          limit: resolvedRule.dailyApplicationLimit,
          used: dailyEffective,
          remaining: 0,
        },
      );
    } else {
      evaluatedRules.dailyLimit = {
        status: 'PASSED',
        details: {
          limit: resolvedRule.dailyApplicationLimit,
          used: dailyEffective,
          remaining: resolvedRule.dailyApplicationLimit - dailyEffective,
        },
      };
    }

    if (
      resolvedRule.weeklyApplicationLimit != null &&
      weeklyEffective >= resolvedRule.weeklyApplicationLimit
    ) {
      push(
        'weeklyLimit',
        {
          code: READINESS_REASON_CODES.WEEKLY_LIMIT_REACHED,
          message: `Weekly application limit of ${resolvedRule.weeklyApplicationLimit} has been reached.`,
          rule: 'weeklyLimit',
          severity: 'BLOCKING',
        },
        'FAILED',
        {
          limit: resolvedRule.weeklyApplicationLimit,
          used: weeklyEffective,
          remaining: 0,
        },
      );
    } else {
      evaluatedRules.weeklyLimit = {
        status: 'PASSED',
        details: {
          limit: resolvedRule.weeklyApplicationLimit,
          used: weeklyEffective,
          remaining:
            resolvedRule.weeklyApplicationLimit == null
              ? null
              : resolvedRule.weeklyApplicationLimit - weeklyEffective,
        },
      };
    }

    const consent = await this.consentRepository.findActiveByType(userId, 'RESUME_USAGE');
    if (!consent) {
      push(
        'consent',
        {
          code: READINESS_REASON_CODES.CONSENT_REQUIRED,
          message: 'Grant RESUME_USAGE consent before approving or submitting.',
          rule: 'consent',
          severity: 'BLOCKING',
          collectionMode: 'ONBOARDING',
        },
        'FAILED',
      );
    } else {
      evaluatedRules.consent = { status: 'PASSED', details: { consentId: consent.id } };
    }

    const channel = channelResult.channel;
    const adapter = this.adapterRegistry.get(channel);
    if (channel === 'UNSUPPORTED' || !adapter) {
      push(
        'channelSupport',
        {
          code: READINESS_REASON_CODES.CHANNEL_UNSUPPORTED,
          message: `No submission adapter is registered for channel ${channel}.`,
          rule: 'channelSupport',
          severity: 'BLOCKING',
        },
        'FAILED',
        { channel },
      );
    } else {
      evaluatedRules.channelSupport = { status: 'PASSED', details: { channel } };
    }

    if (input.jobApplicationId) {
      const existingByJob = await this.jobApplicationRepository.findByUserIdAndJobId(userId, jobId);
      if (
        existingByJob &&
        existingByJob.id !== input.jobApplicationId &&
        existingByJob.status !== 'WITHDRAWN'
      ) {
        push(
          'duplicate',
          {
            code: READINESS_REASON_CODES.DUPLICATE_JOB_APPLICATION,
            message: 'An active auto-apply submission already exists for this job.',
            rule: 'duplicate',
            severity: 'BLOCKING',
          },
          'FAILED',
          { existingApplicationId: existingByJob.id },
        );
      }
    }

    const trackerDup = await this.trackerDuplicateLookup.findActiveByUserAndJobId(userId, jobId);
    if (trackerDup) {
      warnings.push({
        code: READINESS_REASON_CODES.DUPLICATE_TRACKER_APPLICATION,
        message: 'A recruitment-tracker application already exists for this job.',
        rule: 'duplicate',
        severity: 'WARNING',
        metadata: { trackerApplicationId: trackerDup.id, status: trackerDup.currentStatus },
      });
    }
    if (!evaluatedRules.duplicate) {
      evaluatedRules.duplicate = {
        status: 'PASSED',
        details: trackerDup
          ? { trackerWarning: true, trackerApplicationId: trackerDup.id }
          : undefined,
      };
    }

    if (profile && !profile.links.portfolio) {
      push(
        'optionalLinks',
        {
          code: READINESS_REASON_CODES.PORTFOLIO_NOT_PROVIDED,
          message: 'A portfolio URL may improve this application.',
          field: 'portfolioUrl',
          rule: 'optionalLinks',
          severity: 'WARNING',
          collectionMode: 'PROGRESSIVE',
        },
        'NOT_APPLICABLE',
      );
    } else {
      evaluatedRules.optionalLinks = { status: 'PASSED' };
    }

    return this.finalize(
      this.decide(blockingReasons),
      blockingReasons,
      warnings,
      evaluatedRules,
      evaluatedAt,
    );
  }

  private decide(blocking: ApplicationReadinessReason[]): ApplicationReadinessDecision {
    if (blocking.length === 0) return 'READY';
    const codes = new Set(blocking.map((r) => r.code));
    if (
      codes.has(READINESS_REASON_CODES.FEATURE_DISABLED) ||
      codes.has(READINESS_REASON_CODES.AUTO_APPLY_PAUSED)
    ) {
      return 'FEATURE_DISABLED';
    }
    if (
      codes.has(READINESS_REASON_CODES.JOB_NOT_FOUND) ||
      codes.has(READINESS_REASON_CODES.JOB_NOT_ACTIVE) ||
      codes.has(READINESS_REASON_CODES.APPLY_URL_MISSING)
    ) {
      return 'JOB_UNAVAILABLE';
    }
    if (codes.has(READINESS_REASON_CODES.DUPLICATE_JOB_APPLICATION)) return 'DUPLICATE';
    if (codes.has(READINESS_REASON_CODES.CONSENT_REQUIRED)) return 'CONSENT_REQUIRED';
    if (codes.has(READINESS_REASON_CODES.CHANNEL_UNSUPPORTED)) return 'CHANNEL_UNSUPPORTED';
    if (
      codes.has(READINESS_REASON_CODES.DAILY_LIMIT_REACHED) ||
      codes.has(READINESS_REASON_CODES.WEEKLY_LIMIT_REACHED)
    ) {
      return 'LIMIT_REACHED';
    }
    if (
      codes.has(READINESS_REASON_CODES.MATCH_SCORE_BELOW_THRESHOLD) ||
      codes.has(READINESS_REASON_CODES.REMOTE_INCOMPATIBLE) ||
      codes.has(READINESS_REASON_CODES.SALARY_INCOMPATIBLE) ||
      codes.has(READINESS_REASON_CODES.COMPANY_BLACKLISTED) ||
      codes.has(READINESS_REASON_CODES.TITLE_EXCLUDED) ||
      codes.has(READINESS_REASON_CODES.SOURCE_EXCLUDED)
    ) {
      return 'NOT_ELIGIBLE';
    }
    return 'INFORMATION_REQUIRED';
  }

  private finalize(
    decision: ApplicationReadinessDecision,
    blockingReasons: ApplicationReadinessReason[],
    warnings: ApplicationReadinessReason[],
    evaluatedRules: Record<string, ApplicationReadinessRuleResult>,
    evaluatedAt: Date,
  ): ApplicationReadinessResult {
    const ready = decision === 'READY' && blockingReasons.length === 0;
    return {
      decision: ready ? 'READY' : decision,
      ready,
      blockingReasons,
      warnings,
      evaluatedRules,
      evaluatedAt,
    };
  }
}

export function assertReadinessReady(
  result: ApplicationReadinessResult,
  stage: ApplicationReadinessStage,
): void {
  if (result.ready) return;
  throw new AppError(
    `Application is not ready for ${stage}: ${result.decision}`,
    result.decision === 'CONSENT_REQUIRED' || result.decision === 'FEATURE_DISABLED' ? 403 : 409,
    `READINESS_${result.decision}`,
    {
      decision: result.decision,
      blockingReasons: result.blockingReasons,
      warnings: result.warnings,
      evaluatedRules: result.evaluatedRules,
      evaluatedAt: result.evaluatedAt,
    },
  );
}

/** Maps readiness decision onto planner lifecycle decision values. */
export function readinessToPlannerDecision(
  decision: ApplicationReadinessDecision,
): 'READY_FOR_REVIEW' | 'INFORMATION_REQUIRED' | 'NOT_ELIGIBLE' | 'UNSUPPORTED_CHANNEL' {
  switch (decision) {
    case 'READY':
      return 'READY_FOR_REVIEW';
    case 'NOT_ELIGIBLE':
      return 'NOT_ELIGIBLE';
    case 'CHANNEL_UNSUPPORTED':
      return 'UNSUPPORTED_CHANNEL';
    case 'JOB_UNAVAILABLE':
      return 'NOT_ELIGIBLE';
    case 'LIMIT_REACHED':
    case 'CONSENT_REQUIRED':
    case 'FEATURE_DISABLED':
    case 'DUPLICATE':
    case 'INFORMATION_REQUIRED':
    default:
      return 'INFORMATION_REQUIRED';
  }
}
