import { describe, expect, it } from 'vitest';
import {
  READINESS_STAGE_POLICY,
  stageSeverity,
} from '@/modules/auto-apply/constants/readiness-stage-policy.js';
import { ApplicationReadinessStage } from '@/modules/auto-apply/types/application-readiness.types.js';

const LEGACY_STAGES: ApplicationReadinessStage[] = ['PLAN', 'APPROVE', 'QUEUE', 'SUBMIT'];

/** Snapshot of pre-HANDOFF severities — must remain byte-identical for legacy stages. */
const LEGACY_POLICY_SNAPSHOT: Record<
  string,
  Record<'PLAN' | 'APPROVE' | 'QUEUE' | 'SUBMIT', 'BLOCKING' | 'WARNING' | 'SKIP'>
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
  matchScorePresence: {
    PLAN: 'WARNING',
    APPROVE: 'WARNING',
    QUEUE: 'WARNING',
    SUBMIT: 'WARNING',
  },
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

describe('READINESS_STAGE_POLICY HANDOFF (AA-053)', () => {
  it('keeps PLAN/APPROVE/QUEUE/SUBMIT severities byte-identical to the pre-HANDOFF matrix', () => {
    for (const [check, legacyRow] of Object.entries(LEGACY_POLICY_SNAPSHOT)) {
      for (const stage of LEGACY_STAGES) {
        expect(READINESS_STAGE_POLICY[check][stage]).toBe(legacyRow[stage]);
      }
    }
  });

  it('blocks only procedural disqualifiers at HANDOFF', () => {
    expect(stageSeverity('jobAvailable', 'HANDOFF')).toBe('BLOCKING');
    expect(stageSeverity('consent', 'HANDOFF')).toBe('BLOCKING');
    expect(stageSeverity('eligibilityHardRules', 'HANDOFF')).toBe('BLOCKING');
    expect(stageSeverity('featureEnabled', 'HANDOFF')).toBe('BLOCKING');
    expect(stageSeverity('pauseStatus', 'HANDOFF')).toBe('BLOCKING');
  });

  it('treats match score and analysis soft signals as WARNING at HANDOFF', () => {
    expect(stageSeverity('matchScore', 'HANDOFF')).toBe('WARNING');
    expect(stageSeverity('matchScorePresence', 'HANDOFF')).toBe('WARNING');
    expect(stageSeverity('analysisWorkRegion', 'HANDOFF')).toBe('WARNING');
    expect(stageSeverity('analysisExperience', 'HANDOFF')).toBe('WARNING');
    expect(stageSeverity('analysisMobileExperience', 'HANDOFF')).toBe('WARNING');
    expect(stageSeverity('analysisPortfolio', 'HANDOFF')).toBe('WARNING');
    expect(stageSeverity('analysisSponsorship', 'HANDOFF')).toBe('WARNING');
    expect(stageSeverity('sponsorship', 'HANDOFF')).toBe('WARNING');
  });

  it('skips rate limits at HANDOFF', () => {
    expect(stageSeverity('dailyLimit', 'HANDOFF')).toBe('SKIP');
    expect(stageSeverity('weeklyLimit', 'HANDOFF')).toBe('SKIP');
  });

  it('includes HANDOFF on every policy row', () => {
    for (const row of Object.values(READINESS_STAGE_POLICY)) {
      expect(row).toHaveProperty('HANDOFF');
    }
  });
});
