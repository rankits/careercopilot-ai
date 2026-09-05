import { describe, expect, it } from 'vitest';
import type { ApplicationPageAnalysisDto } from '@/modules/auto-apply/types/application-page-analysis.types.js';
import type { CandidateApplicationProfileDto } from '@/modules/auto-apply/types/candidate-profile.types.js';
import {
  computeProfileJobMatch,
  computeProfileJobMatchContentHash,
} from '@/modules/auto-apply/utils/profile-job-match.util.js';

function analysis(overrides: Partial<ApplicationPageAnalysisDto> = {}): ApplicationPageAnalysisDto {
  const now = new Date();
  return {
    id: 'analysis-1',
    jobId: 'job-1',
    jobApplicationId: null,
    schemaVersion: 1,
    extractorVersion: '1',
    extractionPolicyVersion: '1',
    provider: 'ASHBY',
    jobPageUrl: 'https://example.com/job',
    applicationUrl: 'https://example.com/apply',
    jobPageStatus: 'COMPLETE',
    formStatus: 'NOT_INSPECTED',
    submissionCapability: 'EXTERNAL_MANUAL',
    outcomeStatus: 'JOB_PAGE_ANALYZED',
    requirements: [],
    fields: [],
    snapshot: {
      contentHash: 'abc',
      sanitizedTextLength: 100,
      httpStatus: 200,
      fetchedAt: now.toISOString(),
      finalUrl: 'https://example.com/apply',
    },
    freshness: {
      jobStatusCheckedAt: now.toISOString(),
      requirementsAnalyzedAt: now.toISOString(),
    },
    idempotencyKey: 'key',
    analyzedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...overrides,
  };
}

function profile(
  overrides: Partial<CandidateApplicationProfileDto['preferences']> = {},
): CandidateApplicationProfileDto {
  return {
    id: 'profile-1',
    userId: 'user-1',
    preferences: {
      desiredRoles: ['Business Development Representative'],
      preferredLocations: ['Dubai'],
      remotePreferences: ['REMOTE'],
      requiresSponsorship: false,
      currentCountry: 'AE',
      ...overrides,
    },
    links: {},
    verification: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const job = {
  id: 'job-1',
  title: 'Business Development Representative, MEA',
  companySlug: 'notion',
  skills: ['Salesforce', 'Outbound'],
};

describe('computeProfileJobMatch', () => {
  it('marks INFORMATION_REQUIRED when mandatory vault facts are missing', () => {
    const result = computeProfileJobMatch({
      job,
      analysis: analysis({
        requirements: [
          {
            code: 'WORK_REGION',
            operator: 'IN',
            value: ['AE'],
            importance: 'REQUIRED',
            assertion: 'REQUIRES',
            required: true,
            confidence: 0.9,
            evidenceStrength: 'EXPLICIT_TEXT',
            extractionMethod: 'DETERMINISTIC',
            sourceUrl: 'https://example.com',
            geographic: {
              rawValue: 'UAE',
              normalizedRegion: 'UNITED_ARAB_EMIRATES',
              explicitCountries: ['AE'],
              interpretationStatus: 'EXPLICIT_COUNTRIES',
            },
          },
        ],
      }),
      candidate: {
        profile: profile(),
        answers: new Map(), // no work auth / region / years
      },
    });

    expect(result.eligibility.status).toBe('INFORMATION_REQUIRED');
    expect(
      result.missingInformation.some((item) => item.code === 'WORK_AUTHORIZATION_MISSING'),
    ).toBe(true);
    expect(result.skillsMatch.unknown).toEqual(['Salesforce', 'Outbound']);
  });

  it('marks NOT_ELIGIBLE on confirmed location incompatibility', () => {
    const result = computeProfileJobMatch({
      job,
      analysis: analysis({
        requirements: [
          {
            code: 'WORK_REGION',
            operator: 'IN',
            value: ['US'],
            importance: 'REQUIRED',
            assertion: 'REQUIRES',
            required: true,
            confidence: 0.95,
            evidenceStrength: 'EXPLICIT_TEXT',
            extractionMethod: 'DETERMINISTIC',
            sourceUrl: 'https://example.com',
            geographic: {
              rawValue: 'United States',
              normalizedRegion: 'UNITED_STATES',
              explicitCountries: ['US'],
              interpretationStatus: 'EXPLICIT_COUNTRIES',
            },
          },
        ],
      }),
      candidate: {
        profile: profile({ requiresSponsorship: false }),
        answers: new Map([
          ['work_authorization', 'Authorized to work'],
          ['current_work_region', 'IN'],
          ['years_of_experience', '5'],
          ['sponsorship_required', 'no'],
        ]),
      },
    });

    expect(result.eligibility.status).toBe('NOT_ELIGIBLE');
    expect(result.locationMatch.status).toBe('NO_MATCH');
    expect(
      result.eligibility.blockers.some((b) => b.code === 'JOB_LOCATION_REQUIREMENT_NOT_MET'),
    ).toBe(true);
  });

  it('returns ELIGIBLE with role/experience/location matches when facts align', () => {
    const result = computeProfileJobMatch({
      job,
      analysis: analysis({
        requirements: [
          {
            code: 'WORK_REGION',
            operator: 'IN',
            value: ['AE'],
            importance: 'REQUIRED',
            assertion: 'REQUIRES',
            required: true,
            confidence: 0.9,
            evidenceStrength: 'EXPLICIT_TEXT',
            extractionMethod: 'DETERMINISTIC',
            sourceUrl: 'https://example.com',
            geographic: {
              rawValue: 'UAE',
              normalizedRegion: 'UNITED_ARAB_EMIRATES',
              explicitCountries: ['AE'],
              interpretationStatus: 'EXPLICIT_COUNTRIES',
            },
          },
          {
            code: 'TOTAL_EXPERIENCE_YEARS',
            operator: 'GTE',
            value: 2,
            importance: 'REQUIRED',
            assertion: 'REQUIRES',
            required: true,
            confidence: 0.9,
            evidenceStrength: 'EXPLICIT_TEXT',
            extractionMethod: 'DETERMINISTIC',
            sourceUrl: 'https://example.com',
          },
        ],
      }),
      candidate: {
        profile: profile(),
        answers: new Map([
          ['work_authorization', 'Authorized'],
          ['current_work_region', 'AE'],
          ['years_of_experience', '4'],
          ['sponsorship_required', 'no'],
        ]),
      },
      recommendationScoreFallback: 0.82,
    });

    expect(result.eligibility.status).toBe('ELIGIBLE');
    expect(result.roleMatch.status).toBe('PARTIAL');
    expect(result.experienceMatch.status).toBe('MATCH');
    expect(result.locationMatch.status).toBe('MATCH');
    expect(result.overallAlignment).toBeGreaterThan(0.5);
    expect(result.recommendationScoreFallback).toBe(0.82);
    expect(result.warnings.some((w) => w.code === 'RECOMMENDATION_SCORE_CONTEXT')).toBe(true);
    expect(result.dataSources).toEqual({
      verifiedProfile: true,
      answerVault: true,
      storedJobData: true,
      jobPageAnalysis: true,
    });
    expect(result.topStrengths.length).toBeGreaterThan(0);
    expect(result.keyGaps.some((g) => g.includes('Unconfirmed skill'))).toBe(true);
  });

  it('warns on stale analysis without treating it as hard incompatibility', () => {
    const stale = analysis({
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    });
    const result = computeProfileJobMatch({
      job,
      analysis: stale,
      candidate: {
        profile: profile(),
        answers: new Map([
          ['work_authorization', 'Authorized'],
          ['sponsorship_required', 'no'],
        ]),
      },
    });
    expect(result.warnings.some((w) => w.code === 'ANALYSIS_STALE')).toBe(true);
    expect(result.eligibility.status).not.toBe('NOT_ELIGIBLE');
  });

  it('does not read resume-shaped fields — only profile + vault answers', () => {
    const result = computeProfileJobMatch({
      job,
      analysis: analysis(),
      candidate: {
        profile: profile({ desiredRoles: [] }),
        answers: new Map([['work_authorization', 'Authorized']]),
      },
    });
    expect(result.roleMatch.status).toBe('UNKNOWN');
    expect(result.skillsMatch.matched).toEqual([]);
    expect(result.skillsMatch.missing).toEqual([]);
  });
});

describe('computeProfileJobMatchContentHash', () => {
  it('changes when analysis id or answers change', () => {
    const base = {
      analysisId: 'a1',
      jobId: 'job-1',
      jobTitle: 'BDR',
      jobSkills: ['Salesforce'],
      preferences: { desiredRoles: ['BDR'] },
      answers: { work_authorization: 'yes' },
    };
    const h1 = computeProfileJobMatchContentHash(base);
    const h2 = computeProfileJobMatchContentHash({ ...base, analysisId: 'a2' });
    const h3 = computeProfileJobMatchContentHash({
      ...base,
      answers: { work_authorization: 'no' },
    });
    expect(h1).not.toBe(h2);
    expect(h1).not.toBe(h3);
  });
});
