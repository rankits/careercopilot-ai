import { describe, expect, it } from 'vitest';

import { toApplicationPageAnalysisSummary } from '@/modules/auto-apply/types/application-page-analysis-summary.types.js';
import type { ApplicationPageAnalysisDto } from '@/modules/auto-apply/types/application-page-analysis.types.js';
import {
  APPLICATION_PAGE_ANALYSIS_SCHEMA_VERSION,
  APPLICATION_PAGE_EXTRACTION_POLICY_VERSION,
  APPLICATION_PAGE_EXTRACTOR_VERSION,
} from '@/modules/auto-apply/types/application-page-analysis.types.js';

describe('toApplicationPageAnalysisSummary', () => {
  it('returns null for missing analysis', () => {
    expect(toApplicationPageAnalysisSummary(null)).toBeNull();
  });

  it('maps provider, EXTERNAL_MANUAL, form status, and requirements without raw text', () => {
    const analysis = {
      id: 'a1',
      jobId: 'job-1',
      schemaVersion: APPLICATION_PAGE_ANALYSIS_SCHEMA_VERSION,
      extractorVersion: APPLICATION_PAGE_EXTRACTOR_VERSION,
      extractionPolicyVersion: APPLICATION_PAGE_EXTRACTION_POLICY_VERSION,
      provider: 'ASHBY',
      jobPageUrl: 'https://jobs.ashbyhq.com/linear/x',
      applicationUrl: 'https://jobs.ashbyhq.com/linear/x',
      jobPageStatus: 'COMPLETE',
      formStatus: 'NOT_INSPECTED',
      submissionCapability: 'EXTERNAL_MANUAL',
      outcomeStatus: 'JOB_PAGE_ANALYZED',
      requirements: [
        {
          code: 'WORK_REGION',
          operator: 'IN',
          value: ['NORTH_AMERICA'],
          importance: 'REQUIRED',
          assertion: 'REQUIRES',
          required: true,
          confidence: 0.95,
          evidenceStrength: 'EXPLICIT_TEXT',
          extractionMethod: 'DOM_RULE',
          sourceText: 'candidates based in North America',
          sourceUrl: 'https://jobs.ashbyhq.com/linear/x',
          reviewStatus: 'AUTO_ACCEPTED',
        },
      ],
      fields: [],
      snapshot: {
        contentHash: 'abc',
        sanitizedTextLength: 100,
        httpStatus: 200,
        fetchedAt: new Date().toISOString(),
        finalUrl: 'https://jobs.ashbyhq.com/linear/x',
      },
      freshness: {},
      idempotencyKey: 'k1',
      analyzedAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } satisfies ApplicationPageAnalysisDto;

    const summary = toApplicationPageAnalysisSummary(analysis);
    expect(summary?.provider).toBe('ASHBY');
    expect(summary?.submissionCapability).toBe('EXTERNAL_MANUAL');
    expect(summary?.formStatus).toBe('NOT_INSPECTED');
    expect(summary?.requirements).toHaveLength(1);
    expect(summary?.requirements[0]?.sourceText).toMatch(/North America/);
    expect(summary).not.toHaveProperty('sanitizedText');
  });
});
