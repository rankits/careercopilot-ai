import {
  ApplicationReadinessStage,
  ApplyMode,
} from '@/modules/auto-apply/types/application-readiness.types.js';

export type ReadinessCheckSeverity = 'BLOCKING' | 'WARNING' | 'SKIP';

/**
 * Stage-specific severity for each readiness check.
 * Controllers/workers must not re-interpret these — the readiness service
 * applies this matrix when classifying reasons.
 */
export const READINESS_STAGE_POLICY: Record<
  string,
  Record<ApplicationReadinessStage, ReadinessCheckSeverity>
> = {
  featureEnabled: { PLAN: 'BLOCKING', APPROVE: 'BLOCKING', QUEUE: 'BLOCKING', SUBMIT: 'BLOCKING' },
  pauseStatus: { PLAN: 'BLOCKING', APPROVE: 'BLOCKING', QUEUE: 'BLOCKING', SUBMIT: 'BLOCKING' },
  jobAvailable: { PLAN: 'BLOCKING', APPROVE: 'BLOCKING', QUEUE: 'BLOCKING', SUBMIT: 'BLOCKING' },
  profileComplete: { PLAN: 'BLOCKING', APPROVE: 'BLOCKING', QUEUE: 'BLOCKING', SUBMIT: 'BLOCKING' },
  contactIdentity: { PLAN: 'BLOCKING', APPROVE: 'BLOCKING', QUEUE: 'BLOCKING', SUBMIT: 'BLOCKING' },
  verifiedAnswers: { PLAN: 'BLOCKING', APPROVE: 'BLOCKING', QUEUE: 'BLOCKING', SUBMIT: 'BLOCKING' },
  workAuthorization: {
    PLAN: 'BLOCKING',
    APPROVE: 'BLOCKING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
  },
  sponsorship: { PLAN: 'BLOCKING', APPROVE: 'BLOCKING', QUEUE: 'BLOCKING', SUBMIT: 'BLOCKING' },
  experience: { PLAN: 'BLOCKING', APPROVE: 'BLOCKING', QUEUE: 'BLOCKING', SUBMIT: 'BLOCKING' },
  locationRemote: { PLAN: 'BLOCKING', APPROVE: 'BLOCKING', QUEUE: 'BLOCKING', SUBMIT: 'BLOCKING' },
  eligibilityHardRules: {
    PLAN: 'BLOCKING',
    APPROVE: 'BLOCKING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
  },
  resumeApproved: { PLAN: 'BLOCKING', APPROVE: 'BLOCKING', QUEUE: 'BLOCKING', SUBMIT: 'BLOCKING' },
  /**
   * Presence of a JobRecommendation score. Missing is common for jobs tracked
   * directly from the feed (no For You run) — warn rather than hard-block.
   * Threshold enforcement stays on `matchScore` below.
   */
  matchScorePresence: {
    PLAN: 'WARNING',
    APPROVE: 'WARNING',
    QUEUE: 'WARNING',
    SUBMIT: 'WARNING',
  },
  /** Threshold: warning for assisted/prepare; Autopilot handled via applyMode override. */
  matchScore: { PLAN: 'WARNING', APPROVE: 'WARNING', QUEUE: 'BLOCKING', SUBMIT: 'BLOCKING' },
  analysisAvailability: {
    PLAN: 'WARNING',
    APPROVE: 'WARNING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
  },
  analysisFreshness: {
    PLAN: 'WARNING',
    APPROVE: 'WARNING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
  },
  analysisWorkRegion: {
    PLAN: 'BLOCKING',
    APPROVE: 'BLOCKING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
  },
  analysisExperience: {
    PLAN: 'BLOCKING',
    APPROVE: 'BLOCKING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
  },
  analysisMobileExperience: {
    PLAN: 'BLOCKING',
    APPROVE: 'BLOCKING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
  },
  analysisPortfolio: {
    PLAN: 'BLOCKING',
    APPROVE: 'BLOCKING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
  },
  analysisSponsorship: {
    PLAN: 'BLOCKING',
    APPROVE: 'BLOCKING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
  },
  analysisChannel: { PLAN: 'BLOCKING', APPROVE: 'BLOCKING', QUEUE: 'BLOCKING', SUBMIT: 'BLOCKING' },
  analysisWeakInference: {
    PLAN: 'WARNING',
    APPROVE: 'WARNING',
    QUEUE: 'WARNING',
    SUBMIT: 'WARNING',
  },
  dailyLimit: { PLAN: 'WARNING', APPROVE: 'BLOCKING', QUEUE: 'BLOCKING', SUBMIT: 'BLOCKING' },
  weeklyLimit: { PLAN: 'WARNING', APPROVE: 'BLOCKING', QUEUE: 'BLOCKING', SUBMIT: 'BLOCKING' },
  consent: { PLAN: 'WARNING', APPROVE: 'BLOCKING', QUEUE: 'BLOCKING', SUBMIT: 'BLOCKING' },
  channelSupport: { PLAN: 'BLOCKING', APPROVE: 'BLOCKING', QUEUE: 'BLOCKING', SUBMIT: 'BLOCKING' },
  duplicate: { PLAN: 'BLOCKING', APPROVE: 'BLOCKING', QUEUE: 'BLOCKING', SUBMIT: 'BLOCKING' },
  optionalLinks: { PLAN: 'WARNING', APPROVE: 'WARNING', QUEUE: 'WARNING', SUBMIT: 'WARNING' },
};

export function stageSeverity(
  check: keyof typeof READINESS_STAGE_POLICY,
  stage: ApplicationReadinessStage,
  applyMode?: ApplyMode,
): ReadinessCheckSeverity {
  if (
    applyMode === 'AUTOPILOT' &&
    (check === 'matchScore' || check === 'matchScorePresence' || check === 'analysisFreshness')
  ) {
    return 'BLOCKING';
  }
  if (
    (applyMode === 'PREPARE' || applyMode === 'ASSISTED' || applyMode === 'EXTENSION') &&
    (check === 'matchScore' || check === 'matchScorePresence')
  ) {
    return 'WARNING';
  }
  return READINESS_STAGE_POLICY[check][stage];
}
