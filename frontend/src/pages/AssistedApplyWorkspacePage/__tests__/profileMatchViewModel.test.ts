import { describe, expect, it } from 'vitest';

import type { ProfileJobMatchDto } from '@/features/auto-apply/types/autoApply.types';

import { resolveOverallLabel, toProfileMatchViewModel } from '../profileMatchViewModel';

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
  it('maps a good match to success banner and Good Match label', () => {
    const view = toProfileMatchViewModel(baseMatch());
    expect(resolveOverallLabel(baseMatch())).toBe('GOOD_MATCH');
    expect(view.overallAlignmentPct).toBe(78);
    expect(view.overallLabelText).toBe('Good Match');
    expect(view.bannerTone).toBe('success');
    expect(view.bannerTitle).toContain('good match');
    expect(view.recommendationContextPct).toBe(62);
    expect(view.warnings.every((w) => w.code !== 'RECOMMENDATION_SCORE_CONTEXT')).toBe(true);
    expect(view.sourcesUsed.jobPageAnalysis).toBe(true);
  });

  it('maps information required to limited / warning treatment', () => {
    const match = baseMatch({
      eligibility: {
        status: 'INFORMATION_REQUIRED',
        blockers: [],
      },
      missingInformation: [
        {
          code: 'WORK_AUTH_MISSING',
          message: 'Add your work authorization.',
          field: 'workAuthorization',
        },
      ],
      confidence: 'LOW',
    });
    const view = toProfileMatchViewModel(match);
    expect(view.overallLabel).toBe('LIMITED');
    expect(view.bannerTone).toBe('warning');
    expect(view.informationRequiredCount).toBe(1);
    expect(view.missingInfo[0]?.message).toContain('work authorization');
  });

  it('maps not eligible to error treatment', () => {
    const match = baseMatch({
      overallAlignment: 0.2,
      eligibility: {
        status: 'NOT_ELIGIBLE',
        blockers: [{ code: 'SPONSORSHIP', message: 'Sponsorship required but not available.' }],
      },
    });
    const view = toProfileMatchViewModel(match);
    expect(view.overallLabel).toBe('NOT_ELIGIBLE');
    expect(view.bannerTone).toBe('error');
    expect(view.keyGaps[0]).toContain('Sponsorship');
  });

  it('keeps recommendation score secondary only', () => {
    const view = toProfileMatchViewModel(baseMatch({ recommendationScoreFallback: 0.91 }));
    expect(view.overallAlignmentPct).toBe(78);
    expect(view.recommendationContextPct).toBe(91);
    expect(view.overallAlignmentPct).not.toBe(view.recommendationContextPct);
  });

  it('prefers backend dataSources, topStrengths, and keyGaps when present', () => {
    const view = toProfileMatchViewModel(
      baseMatch({
        dataSources: {
          verifiedProfile: true,
          answerVault: false,
          storedJobData: true,
          jobPageAnalysis: false,
        },
        topStrengths: ['Custom strength from API'],
        keyGaps: ['Custom gap from API'],
      }),
    );
    expect(view.sourcesUsed).toEqual({
      verifiedProfile: true,
      answerVault: false,
      storedJobData: true,
      jobPageAnalysis: false,
    });
    expect(view.topStrengths).toEqual(['Custom strength from API']);
    expect(view.keyGaps).toEqual(['Custom gap from API']);
  });

  it('derives dataSources from evidence when backend field is absent', () => {
    const view = toProfileMatchViewModel(
      baseMatch({
        analysisId: null,
        roleMatch: {
          status: 'MATCH',
          evidence: [
            {
              code: 'ROLE_OK',
              message: 'Aligned',
              source: 'PROFILE',
            },
          ],
          jobTitle: 'Backend Product Manager',
          desiredRoles: ['Product Manager'],
        },
        workAuthorizationMatch: {
          status: 'MATCH',
          evidence: [
            {
              code: 'AUTH_OK',
              message: 'Authorized',
              source: 'ANSWER_VAULT',
            },
          ],
          candidateAnswer: 'AUTHORIZED',
        },
      }),
    );
    expect(view.sourcesUsed.verifiedProfile).toBe(true);
    expect(view.sourcesUsed.answerVault).toBe(true);
    expect(view.sourcesUsed.jobPageAnalysis).toBe(false);
  });
});
