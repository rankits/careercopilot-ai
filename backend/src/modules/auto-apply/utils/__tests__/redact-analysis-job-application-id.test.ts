import { describe, expect, it } from 'vitest';
import { redactAnalysisJobApplicationId } from '@/modules/auto-apply/utils/redact-analysis-job-application-id.js';
import type { ApplicationPageAnalysisDto } from '@/modules/auto-apply/types/application-page-analysis.types.js';

function sampleAnalysis(
  overrides: Partial<ApplicationPageAnalysisDto> = {},
): ApplicationPageAnalysisDto {
  return {
    id: 'analysis-1',
    jobId: 'job-1',
    jobApplicationId: 'app-owner-1',
    schemaVersion: 1,
    extractorVersion: 'deterministic-v2',
    extractionPolicyVersion: 'policy-v1',
    provider: 'UNKNOWN',
    jobPageUrl: 'https://example.com/jobs/1',
    applicationUrl: null,
    jobPageStatus: 'COMPLETE',
    formStatus: 'NOT_INSPECTED',
    submissionCapability: 'EXTERNAL_MANUAL',
    outcomeStatus: 'JOB_PAGE_ANALYZED',
    requirements: [
      {
        code: 'WORK_AUTH',
        value: true,
        importance: 'REQUIRED',
        assertion: 'REQUIRES',
        required: true,
        confidence: 0.9,
        evidenceStrength: 'EXPLICIT_TEXT',
        extractionMethod: 'DOM_RULE',
        sourceUrl: 'https://example.com/jobs/1',
        reviewStatus: 'AUTO_ACCEPTED',
      },
    ],
    fields: [],
    snapshot: {
      contentHash: 'abc',
      sanitizedTextLength: 10,
      httpStatus: 200,
      fetchedAt: '2026-08-05T00:00:00.000Z',
      finalUrl: 'https://example.com/jobs/1',
    },
    freshness: {},
    idempotencyKey: 'key-1',
    analyzedAt: '2026-08-05T00:00:00.000Z',
    expiresAt: '2026-08-12T00:00:00.000Z',
    createdAt: '2026-08-05T00:00:00.000Z',
    updatedAt: '2026-08-05T00:00:00.000Z',
    ...overrides,
  };
}

describe('redactAnalysisJobApplicationId (AA-012)', () => {
  it('keeps jobApplicationId when it matches the viewer own application', () => {
    const analysis = sampleAnalysis({ jobApplicationId: 'app-a' });
    expect(redactAnalysisJobApplicationId(analysis, 'app-a').jobApplicationId).toBe('app-a');
  });

  it('nulls jobApplicationId for a different viewer application', () => {
    const analysis = sampleAnalysis({ jobApplicationId: 'app-a' });
    const redacted = redactAnalysisJobApplicationId(analysis, 'app-b');
    expect(redacted.jobApplicationId).toBeNull();
    expect(redacted.requirements).toEqual(analysis.requirements);
  });

  it('nulls jobApplicationId when the viewer has no tracked application', () => {
    const analysis = sampleAnalysis({ jobApplicationId: 'app-a' });
    expect(redactAnalysisJobApplicationId(analysis, null).jobApplicationId).toBeNull();
  });

  it('leaves already-null jobApplicationId unchanged', () => {
    const analysis = sampleAnalysis({ jobApplicationId: null });
    expect(redactAnalysisJobApplicationId(analysis, 'app-a').jobApplicationId).toBeNull();
  });
});
