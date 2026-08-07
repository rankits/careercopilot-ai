import { describe, expect, it } from 'vitest';

import type { ProfileJobMatchDto } from '@/features/auto-apply/types/autoApply.types';

import {
  classifyProfileMatchIssue,
  resolveAlignmentLabel,
  toFitViewModel,
  toProfileMatchViewModel,
} from '../profileMatchViewModel';

function baseMatch(overrides: Partial<ProfileJobMatchDto> = {}): ProfileJobMatchDto {
  return {
    overallAlignment: 0.78,
    eligibility: { status: 'ELIGIBLE', blockers: [] },
    roleMatch: {
      status: 'MATCH',
      evidence: [{ code: 'ROLE_OK', message: '5+ years in product management' }],
      jobTitle: 'Backend Product Manager',
      desiredRoles: ['Product Manager'],
    },
    skillsMatch: { matched: [], missing: [], unknown: ['Machine Learning', 'Go'] },
    experienceMatch: {
      requiredYears: 5,
      candidateYears: 6,
      status: 'MATCH',
      evidence: [{ code: 'EXP_OK', message: 'Meets minimum experience' }],
    },
    locationMatch: {
      status: 'MATCH',
      evidence: [{ code: 'LOC_OK', message: 'Compatible with San Francisco hybrid' }],
      candidateRegion: 'US-CA',
    },
    workAuthorizationMatch: {
      status: 'MATCH',
      evidence: [{ code: 'AUTH_OK', message: 'Authorized to work' }],
      candidateAnswer: 'AUTHORIZED',
    },
    sponsorshipMatch: {
      status: 'NOT_APPLICABLE',
      evidence: [{ code: 'SPONSOR_NA', message: 'Sponsorship not required' }],
      candidateRequiresSponsorship: false,
      jobProvidesSponsorship: false,
    },
    confidence: 'HIGH',
    warnings: [
      {
        code: 'RECOMMENDATION_SCORE_CONTEXT',
        message: 'Legacy recommendation score provided for context only.',
      },
    ],
    missingInformation: [],
    recommendationScoreFallback: 0.62,
    analysisId: 'analysis-1',
    jobId: 'job-1',
    matchedAt: '2026-08-06T12:00:00.000Z',
    schemaVersion: 1,
    ...overrides,
  };
}

describe('profileMatchViewModel', () => {
  it('maps eligible profile with alignment separate from eligibility', () => {
    const view = toProfileMatchViewModel(baseMatch());
    expect(resolveAlignmentLabel(baseMatch())).toBe('GOOD_ALIGNMENT');
    expect(view.alignment.pct).toBe(78);
    expect(view.alignment.labelText).toBe('Good alignment');
    expect(view.eligibility.status).toBe('ELIGIBLE');
    expect(view.banner.tone).toBe('success');
    expect(view.banner.title).toMatch(/meets the confirmed eligibility/i);
    expect(view.recommendationContextPct).toBe(62);
    expect(view.sources.jobPageAnalysis).toBe(true);
    expect(view.navigation.canReviewResume).toBe(true);
  });

  it('keeps high alignment with not-eligible status', () => {
    const match = baseMatch({
      overallAlignment: 0.85,
      eligibility: {
        status: 'NOT_ELIGIBLE',
        blockers: [
          {
            code: 'JOB_LOCATION_REQUIREMENT_NOT_MET',
            message: 'Job requires North America; candidate is outside this region.',
          },
        ],
      },
    });
    const view = toFitViewModel({
      profileMatch: match,
      handoffReadiness: {
        decision: 'BLOCKED',
        ready: false,
        blockingReasons: [
          { code: 'LOCATION', message: 'Location incompatible', severity: 'BLOCKING' },
        ],
        warnings: [],
      },
    });
    expect(view.alignment.label).toBe('STRONG_ALIGNMENT');
    expect(view.eligibility.status).toBe('NOT_ELIGIBLE');
    expect(view.banner.tone).toBe('error');
    expect(view.hardBlockers.length).toBeGreaterThanOrEqual(1);
    expect(view.navigation.canReviewResume).toBe(true);
    expect(view.navigation.canOpenEmployerHandoff).toBe(false);
    expect(view.navigation.handoffBlockedReasons[0]).toMatch(/Location/i);
  });

  it('maps information required without treating it as a hard blocker', () => {
    const match = baseMatch({
      eligibility: {
        status: 'INFORMATION_REQUIRED',
        blockers: [],
      },
      missingInformation: [
        {
          code: 'WORK_AUTHORIZATION_MISSING',
          message: 'Add your work authorization.',
          field: 'workAuthorization',
        },
      ],
      confidence: 'LOW',
    });
    const view = toProfileMatchViewModel(match);
    expect(view.eligibility.status).toBe('INFORMATION_REQUIRED');
    expect(view.banner.tone).toBe('warning');
    expect(view.informationRequired).toHaveLength(1);
    expect(view.hardBlockers).toHaveLength(0);
    expect(view.confidence.level).toBe('LOW');
  });

  it('does not synthesize dimension percentages from status', () => {
    const view = toProfileMatchViewModel(baseMatch());
    for (const dim of view.dimensions) {
      expect(dim.score).toBeNull();
      expect(dim.scoreLabel).toBeNull();
      expect(dim.statusLabel.length).toBeGreaterThan(0);
    }
    const skills = view.dimensions.find((d) => d.id === 'SKILLS');
    expect(skills?.statusLabel).toBe('Not confirmed');
    expect(skills?.score).toBeNull();
  });

  it('treats unknown skills as advisory, not confirmed gaps', () => {
    const view = toProfileMatchViewModel(baseMatch());
    expect(view.skillsUnknown).toEqual(['Machine Learning', 'Go']);
    expect(view.hardBlockers.every((i) => i.code !== 'SKILL_NOT_CONFIRMED')).toBe(true);
    expect(view.informationRequired.every((i) => i.code !== 'SKILL_NOT_CONFIRMED')).toBe(true);
    expect(view.advisoryGaps.some((i) => i.code === 'SKILL_NOT_CONFIRMED')).toBe(true);
  });

  it('classifies hard blockers, missing info, and advisory issues by code', () => {
    expect(
      classifyProfileMatchIssue({
        code: 'JOB_LOCATION_REQUIREMENT_NOT_MET',
        kind: 'blocker',
      }),
    ).toBe('HARD_BLOCKER');
    expect(
      classifyProfileMatchIssue({
        code: 'WORK_AUTHORIZATION_MISSING',
        kind: 'missing',
      }),
    ).toBe('INFORMATION_REQUIRED');
    expect(
      classifyProfileMatchIssue({
        code: 'ROLE_NO_MATCH',
        kind: 'warning',
      }),
    ).toBe('ADVISORY');
    expect(
      classifyProfileMatchIssue({
        code: 'SKILL_X',
        kind: 'skill_unknown',
      }),
    ).toBe('ADVISORY');
  });

  it('handles null alignment as insufficient data', () => {
    const view = toProfileMatchViewModel(baseMatch({ overallAlignment: null }));
    expect(view.alignment.label).toBe('INSUFFICIENT_DATA');
    expect(view.alignment.pct).toBeNull();
  });

  it('keeps recommendation score secondary only', () => {
    const view = toProfileMatchViewModel(baseMatch({ recommendationScoreFallback: 0.91 }));
    expect(view.alignment.pct).toBe(78);
    expect(view.recommendationContextPct).toBe(91);
    expect(view.alignment.pct).not.toBe(view.recommendationContextPct);
  });

  it('marks completed applications as completedMode and blocks handoff CTA path', () => {
    const view = toFitViewModel({
      profileMatch: baseMatch(),
      applicationStatus: 'SUBMITTED',
      handoffReadiness: {
        decision: 'READY',
        ready: true,
        blockingReasons: [],
        warnings: [],
      },
    });
    expect(view.completedMode).toBe(true);
    expect(view.navigation.canOpenEmployerHandoff).toBe(false);
    expect(view.navigation.canReviewResume).toBe(true);
  });

  it('allows handoff only when readiness.ready is true', () => {
    const ready = toFitViewModel({
      profileMatch: baseMatch(),
      handoffReadiness: {
        decision: 'READY',
        ready: true,
        blockingReasons: [],
        warnings: [{ code: 'WARN', message: 'Advisory warning', severity: 'WARNING' }],
      },
    });
    expect(ready.navigation.canOpenEmployerHandoff).toBe(true);

    const blocked = toFitViewModel({
      profileMatch: baseMatch(),
      handoffReadiness: {
        decision: 'BLOCKED',
        ready: false,
        blockingReasons: [{ code: 'CONSENT', message: 'Consent required', severity: 'BLOCKING' }],
        warnings: [],
      },
    });
    expect(blocked.navigation.canOpenEmployerHandoff).toBe(false);
    expect(blocked.navigation.handoffBlockedReasons).toContain('Consent required');
  });

  it('prefers backend dataSources and topStrengths when present', () => {
    const view = toProfileMatchViewModel(
      baseMatch({
        dataSources: {
          verifiedProfile: true,
          answerVault: false,
          storedJobData: true,
          jobPageAnalysis: false,
        },
        topStrengths: ['Custom strength from API'],
      }),
    );
    expect(view.sources).toEqual({
      verifiedProfile: true,
      answerVault: false,
      storedJobData: true,
      jobPageAnalysis: false,
    });
    expect(view.confirmedStrengths).toEqual(['Custom strength from API']);
  });
});
