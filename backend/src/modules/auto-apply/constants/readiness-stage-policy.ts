import { ApplicationReadinessStage } from '@/modules/auto-apply/types/application-readiness.types.js';

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
  matchScore: { PLAN: 'BLOCKING', APPROVE: 'BLOCKING', QUEUE: 'BLOCKING', SUBMIT: 'BLOCKING' },
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
): ReadinessCheckSeverity {
  return READINESS_STAGE_POLICY[check][stage];
}
