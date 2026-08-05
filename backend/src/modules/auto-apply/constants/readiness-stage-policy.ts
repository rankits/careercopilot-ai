import {
  ApplicationReadinessStage,
  ApplyMode,
} from '@/modules/auto-apply/types/application-readiness.types.js';

export type ReadinessCheckSeverity = 'BLOCKING' | 'WARNING' | 'SKIP';

/**
 * Stage-specific severity for each readiness check.
 * Controllers/workers must not re-interpret these — the readiness service
 * applies this matrix when classifying reasons.
 *
 * HANDOFF (Assisted Apply open): only procedural disqualifiers block
 * (inactive job / missing URL / consent / exclusions). Soft analysis signals
 * and match score are WARNING. Confirmed sponsorship mismatch defaults to
 * WARNING (AA-053 open decision). Limits are SKIP — not meaningful for
 * opening an employer site.
 */
export const READINESS_STAGE_POLICY: Record<
  string,
  Record<ApplicationReadinessStage, ReadinessCheckSeverity>
> = {
  featureEnabled: {
    PLAN: 'BLOCKING',
    APPROVE: 'BLOCKING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
    HANDOFF: 'BLOCKING',
  },
  pauseStatus: {
    PLAN: 'BLOCKING',
    APPROVE: 'BLOCKING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
    HANDOFF: 'BLOCKING',
  },
  jobAvailable: {
    PLAN: 'BLOCKING',
    APPROVE: 'BLOCKING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
    HANDOFF: 'BLOCKING',
  },
  profileComplete: {
    PLAN: 'BLOCKING',
    APPROVE: 'BLOCKING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
    HANDOFF: 'WARNING',
  },
  contactIdentity: {
    PLAN: 'BLOCKING',
    APPROVE: 'BLOCKING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
    HANDOFF: 'WARNING',
  },
  verifiedAnswers: {
    PLAN: 'BLOCKING',
    APPROVE: 'BLOCKING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
    HANDOFF: 'WARNING',
  },
  workAuthorization: {
    PLAN: 'BLOCKING',
    APPROVE: 'BLOCKING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
    HANDOFF: 'WARNING',
  },
  sponsorship: {
    PLAN: 'BLOCKING',
    APPROVE: 'BLOCKING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
    HANDOFF: 'WARNING',
  },
  experience: {
    PLAN: 'BLOCKING',
    APPROVE: 'BLOCKING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
    HANDOFF: 'WARNING',
  },
  locationRemote: {
    PLAN: 'BLOCKING',
    APPROVE: 'BLOCKING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
    HANDOFF: 'WARNING',
  },
  eligibilityHardRules: {
    PLAN: 'BLOCKING',
    APPROVE: 'BLOCKING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
    HANDOFF: 'BLOCKING',
  },
  resumeApproved: {
    PLAN: 'BLOCKING',
    APPROVE: 'BLOCKING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
    HANDOFF: 'WARNING',
  },
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
    HANDOFF: 'WARNING',
  },
  /** Threshold: warning for assisted/prepare; Autopilot handled via applyMode override. */
  matchScore: {
    PLAN: 'WARNING',
    APPROVE: 'WARNING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
    HANDOFF: 'WARNING',
  },
  analysisAvailability: {
    PLAN: 'WARNING',
    APPROVE: 'WARNING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
    HANDOFF: 'WARNING',
  },
  analysisFreshness: {
    PLAN: 'WARNING',
    APPROVE: 'WARNING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
    HANDOFF: 'WARNING',
  },
  analysisWorkRegion: {
    PLAN: 'BLOCKING',
    APPROVE: 'BLOCKING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
    HANDOFF: 'WARNING',
  },
  analysisExperience: {
    PLAN: 'BLOCKING',
    APPROVE: 'BLOCKING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
    HANDOFF: 'WARNING',
  },
  analysisMobileExperience: {
    PLAN: 'BLOCKING',
    APPROVE: 'BLOCKING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
    HANDOFF: 'WARNING',
  },
  analysisPortfolio: {
    PLAN: 'BLOCKING',
    APPROVE: 'BLOCKING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
    HANDOFF: 'WARNING',
  },
  analysisSponsorship: {
    PLAN: 'BLOCKING',
    APPROVE: 'BLOCKING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
    HANDOFF: 'WARNING',
  },
  analysisChannel: {
    PLAN: 'BLOCKING',
    APPROVE: 'BLOCKING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
    HANDOFF: 'WARNING',
  },
  analysisWeakInference: {
    PLAN: 'WARNING',
    APPROVE: 'WARNING',
    QUEUE: 'WARNING',
    SUBMIT: 'WARNING',
    HANDOFF: 'WARNING',
  },
  dailyLimit: {
    PLAN: 'WARNING',
    APPROVE: 'BLOCKING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
    HANDOFF: 'SKIP',
  },
  weeklyLimit: {
    PLAN: 'WARNING',
    APPROVE: 'BLOCKING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
    HANDOFF: 'SKIP',
  },
  consent: {
    PLAN: 'WARNING',
    APPROVE: 'BLOCKING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
    HANDOFF: 'BLOCKING',
  },
  channelSupport: {
    PLAN: 'BLOCKING',
    APPROVE: 'BLOCKING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
    HANDOFF: 'WARNING',
  },
  duplicate: {
    PLAN: 'BLOCKING',
    APPROVE: 'BLOCKING',
    QUEUE: 'BLOCKING',
    SUBMIT: 'BLOCKING',
    HANDOFF: 'WARNING',
  },
  optionalLinks: {
    PLAN: 'WARNING',
    APPROVE: 'WARNING',
    QUEUE: 'WARNING',
    SUBMIT: 'WARNING',
    HANDOFF: 'WARNING',
  },
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
