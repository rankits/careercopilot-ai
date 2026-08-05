import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { DeterministicRequirementExtractor } from '@/modules/auto-apply/services/deterministic-requirement-extractor.service.js';
import {
  detectApplicationProvider,
  submissionCapabilityForProvider,
} from '@/modules/auto-apply/services/provider-detection.util.js';
import { evaluateAnalysisAgainstCandidate } from '@/modules/auto-apply/services/analysis-requirement-evaluation.util.js';
import { __testables as fetcherTestables } from '@/modules/auto-apply/services/secure-page-fetcher.service.js';
import { READINESS_REASON_CODES } from '@/modules/auto-apply/constants/readiness-reason-codes.js';
import type { ApplicationPageAnalysisDto } from '@/modules/auto-apply/types/application-page-analysis.types.js';
import {
  APPLICATION_PAGE_ANALYSIS_SCHEMA_VERSION,
  APPLICATION_PAGE_EXTRACTION_POLICY_VERSION,
  APPLICATION_PAGE_EXTRACTOR_VERSION,
} from '@/modules/auto-apply/types/application-page-analysis.types.js';

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../__fixtures__/linear-mobile-product-designer.jd.txt',
);
const linearJd = readFileSync(fixturePath, 'utf8');
const sourceUrl = 'https://jobs.ashbyhq.com/linear/eac7f181-d658-4943-9430-51bae2bcd110';

describe('Pre-Application Intelligence — Linear fixture', () => {
  it('detects Ashby and keeps EXTERNAL_MANUAL capability', () => {
    const provider = detectApplicationProvider(sourceUrl);
    expect(provider).toBe('ASHBY');
    expect(submissionCapabilityForProvider(provider)).toBe('EXTERNAL_MANUAL');
  });

  it('keeps Phase-1 Ashby form inspection as NOT_INSPECTED / EXTERNAL_MANUAL', async () => {
    const extractor = new DeterministicRequirementExtractor();
    const { requirements } = await extractor.extract({
      sanitizedText: linearJd,
      sourceUrl,
      provider: 'ASHBY',
    });
    expect(requirements.length).toBeGreaterThan(0);
    expect(submissionCapabilityForProvider('ASHBY')).toBe('EXTERNAL_MANUAL');
    // Analyzer persists formStatus=NOT_INSPECTED until a browser inspector exists.
    const formStatus: ApplicationPageAnalysisDto['formStatus'] = 'NOT_INSPECTED';
    expect(formStatus).toBe('NOT_INSPECTED');
  });

  it('treats weak inference as warning-only, never a hard eligibility decision', () => {
    const analysis = {
      id: 'analysis-weak',
      jobId: 'job-1',
      schemaVersion: APPLICATION_PAGE_ANALYSIS_SCHEMA_VERSION,
      extractorVersion: APPLICATION_PAGE_EXTRACTOR_VERSION,
      extractionPolicyVersion: APPLICATION_PAGE_EXTRACTION_POLICY_VERSION,
      provider: 'ASHBY' as const,
      jobPageUrl: sourceUrl,
      applicationUrl: sourceUrl,
      jobPageStatus: 'COMPLETE' as const,
      formStatus: 'NOT_INSPECTED' as const,
      submissionCapability: 'EXTERNAL_MANUAL' as const,
      outcomeStatus: 'JOB_PAGE_ANALYZED' as const,
      requirements: [
        {
          code: 'FIGMA_PLUGIN_EXPERIENCE',
          operator: 'EQ' as const,
          value: true,
          importance: 'REQUIRED' as const,
          assertion: 'REQUIRES' as const,
          required: true,
          confidence: 0.98,
          evidenceStrength: 'WEAK_INFERENCE' as const,
          extractionMethod: 'AI_EXTRACTION' as const,
          sourceText: 'Maybe useful to know Figma plugins',
          sourceUrl,
          reviewStatus: 'REVIEW_REQUIRED' as const,
          source: { type: 'JOB_DESCRIPTION' as const, text: 'Maybe useful', url: sourceUrl },
        },
      ],
      fields: [],
      snapshot: {
        contentHash: 'abc',
        sanitizedTextLength: 10,
        httpStatus: 200,
        fetchedAt: new Date().toISOString(),
        finalUrl: sourceUrl,
      },
      freshness: { requirementsAnalyzedAt: new Date().toISOString() },
      idempotencyKey: 'key-weak',
      analyzedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } satisfies ApplicationPageAnalysisDto;

    const result = evaluateAnalysisAgainstCandidate(analysis, {});
    expect(result.reasons.every((r) => r.severity === 'WARNING')).toBe(true);
    expect(result.reasons.some((r) => r.rule === 'analysisWeakInference')).toBe(true);
    expect(result.reasons.some((r) => r.metadata?.decision === 'NOT_ELIGIBLE')).toBe(false);
  });

  it('extracts North America, experience, mobile, portfolio, and sponsorship polarity', async () => {
    const extractor = new DeterministicRequirementExtractor();
    const { requirements } = await extractor.extract({
      sanitizedText: linearJd,
      sourceUrl,
      provider: 'ASHBY',
    });

    const byCode = Object.fromEntries(requirements.map((item) => [item.code, item]));
    expect(byCode.WORK_REGION?.sourceText).toMatch(/North America/i);
    expect(byCode.WORK_REGION?.evidenceStrength).toBe('EXPLICIT_TEXT');
    expect(byCode.WORK_REGION?.geographic?.interpretationStatus).toBe('REVIEW_REQUIRED');

    expect(byCode.TOTAL_EXPERIENCE_YEARS?.value).toBe(5);
    expect(byCode.MOBILE_DESIGN_EXPERIENCE?.required).toBe(true);
    expect(byCode.PORTFOLIO?.required).toBe(true);

    expect(byCode.SPONSORSHIP?.assertion).toBe('DOES_NOT_PROVIDE');
    expect(byCode.SPONSORSHIP?.required).toBe(false);
  });

  it('maps unknown region to INFORMATION_REQUIRED and India to NOT_ELIGIBLE codes', async () => {
    const extractor = new DeterministicRequirementExtractor();
    const { requirements } = await extractor.extract({
      sanitizedText: linearJd,
      sourceUrl,
      provider: 'ASHBY',
    });

    const analysis = {
      id: 'analysis-1',
      jobId: 'job-1',
      schemaVersion: APPLICATION_PAGE_ANALYSIS_SCHEMA_VERSION,
      extractorVersion: APPLICATION_PAGE_EXTRACTOR_VERSION,
      extractionPolicyVersion: APPLICATION_PAGE_EXTRACTION_POLICY_VERSION,
      provider: 'ASHBY',
      jobPageUrl: sourceUrl,
      applicationUrl: sourceUrl,
      jobPageStatus: 'COMPLETE',
      formStatus: 'NOT_INSPECTED',
      submissionCapability: 'EXTERNAL_MANUAL',
      outcomeStatus: 'JOB_PAGE_ANALYZED',
      requirements,
      fields: [],
      snapshot: {
        contentHash: 'abc',
        sanitizedTextLength: linearJd.length,
        httpStatus: 200,
        fetchedAt: new Date().toISOString(),
        finalUrl: sourceUrl,
      },
      freshness: { requirementsAnalyzedAt: new Date().toISOString() },
      idempotencyKey: 'key',
      analyzedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } satisfies ApplicationPageAnalysisDto;

    const unknown = evaluateAnalysisAgainstCandidate(analysis, {});
    expect(
      unknown.reasons.some(
        (r) => r.code === READINESS_REASON_CODES.WORK_REGION_VERIFICATION_REQUIRED,
      ),
    ).toBe(true);

    const india = evaluateAnalysisAgainstCandidate(analysis, { workRegionAnswer: 'India' });
    expect(
      india.reasons.some((r) => r.code === READINESS_REASON_CODES.JOB_LOCATION_REQUIREMENT_NOT_MET),
    ).toBe(true);

    // High match score is irrelevant here — location still fails.
    expect(india.rules.analysisWorkRegion?.status).toBe('FAILED');
  });

  it('blocks private SSRF targets', () => {
    expect(fetcherTestables.isPrivateOrBlockedIp('127.0.0.1')).toBe(true);
    expect(fetcherTestables.isPrivateOrBlockedIp('10.0.0.5')).toBe(true);
    expect(fetcherTestables.isPrivateOrBlockedIp('169.254.169.254')).toBe(true);
    expect(fetcherTestables.isPrivateOrBlockedIp('8.8.8.8')).toBe(false);
    expect(() => fetcherTestables.assertSafeHttpUrl('file:///etc/passwd')).toThrow();
    expect(() => fetcherTestables.assertSafeHttpUrl('http://example.com')).toThrow();
  });
});
