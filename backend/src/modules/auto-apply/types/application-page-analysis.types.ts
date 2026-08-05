/**
 * Pre-Application Intelligence — analysis domain types.
 * Extracted facts stay separate from readiness decisions (which live in ApplicationReadinessService).
 */

export const APPLICATION_PAGE_ANALYSIS_SCHEMA_VERSION = 1;
export const APPLICATION_PAGE_EXTRACTOR_VERSION = 'deterministic-v1';
export const APPLICATION_PAGE_EXTRACTION_POLICY_VERSION = 'policy-v1';

export type ApplyMode = 'PREPARE' | 'ASSISTED' | 'AUTOPILOT' | 'EXTENSION';

export type JobPageStatus = 'PENDING' | 'COMPLETE' | 'PARTIAL' | 'FAILED';

export type FormInspectionStatus =
  'NOT_INSPECTED' | 'PARTIAL' | 'COMPLETE' | 'BROWSER_REQUIRED' | 'UNSUPPORTED';

export type SubmissionCapability =
  'AUTHORIZED_API' | 'EMAIL' | 'BROWSER_ASSISTED' | 'EXTERNAL_MANUAL' | 'UNSUPPORTED';

export type ApplicationProvider = 'ASHBY' | 'GREENHOUSE' | 'LEVER' | 'WORKDAY' | 'UNKNOWN';

export type ExtractionMethod =
  'STRUCTURED_DATA' | 'PROVIDER_API' | 'DOM_RULE' | 'AI_EXTRACTION' | 'USER_CONFIRMED';

export type EvidenceStrength =
  'AUTHORITATIVE_STRUCTURED' | 'EXPLICIT_TEXT' | 'STRONG_INFERENCE' | 'WEAK_INFERENCE';

export type RequirementImportance = 'REQUIRED' | 'PREFERRED' | 'OPTIONAL';

export type RequirementAssertion =
  'REQUIRES' | 'ALLOWS' | 'DOES_NOT_ALLOW' | 'PROVIDES' | 'DOES_NOT_PROVIDE' | 'UNKNOWN';

export type RequirementReviewStatus =
  'AUTO_ACCEPTED' | 'REVIEW_REQUIRED' | 'USER_CONFIRMED' | 'REJECTED';

export type RequirementOverrideStatus = 'NONE' | 'USER_PROPOSED' | 'ACCEPTED' | 'REJECTED';

export type GeographicInterpretationStatus =
  'EXPLICIT_COUNTRIES' | 'NORMALIZED_REGION' | 'REVIEW_REQUIRED' | 'UNKNOWN';

export type AnalysisOutcomeStatus =
  | 'JOB_PAGE_ANALYZED'
  | 'FORM_SCHEMA_PARTIAL'
  | 'FORM_SCHEMA_COMPLETE'
  | 'BROWSER_INSPECTION_REQUIRED'
  | 'AUTHENTICATION_REQUIRED'
  | 'CAPTCHA_PRESENT'
  | 'UNSUPPORTED'
  | 'FETCH_FAILED';

export interface AnalysisFreshness {
  jobStatusCheckedAt?: string;
  applicationUrlCheckedAt?: string;
  requirementsAnalyzedAt?: string;
  formInspectedAt?: string;
}

export interface RequirementSource {
  type: 'JOB_DESCRIPTION' | 'STRUCTURED_DATA' | 'PROVIDER_API' | 'USER_CORRECTION';
  text?: string;
  url: string;
  selector?: string;
}

export interface GeographicValue {
  rawValue: string;
  normalizedRegion?: string;
  explicitCountries: string[];
  interpretationStatus: GeographicInterpretationStatus;
}

export interface RequirementOverride {
  originalValue: unknown;
  normalizedValue: unknown;
  userOverrideValue?: unknown;
  userOverrideReason?: string;
  overrideStatus: RequirementOverrideStatus;
}

export interface ExtractedRequirement {
  code: string;
  operator?: 'IN' | 'GTE' | 'LTE' | 'EQ' | 'REQUIRED';
  value: unknown;
  importance: RequirementImportance;
  assertion: RequirementAssertion;
  /** @deprecated Prefer importance + assertion. Kept for simpler consumers. */
  required: boolean;

  confidence: number;
  evidenceStrength: EvidenceStrength;
  extractionMethod: ExtractionMethod;

  sourceText?: string;
  sourceUrl: string;
  sourceSelector?: string;
  source?: RequirementSource;

  geographic?: GeographicValue;
  override?: RequirementOverride;

  reviewStatus: RequirementReviewStatus;
}

export interface ExtractedApplicationField {
  externalKey: string;
  label: string;
  type:
    'TEXT' | 'LONG_TEXT' | 'URL' | 'FILE' | 'SELECT' | 'BOOLEAN' | 'NUMBER' | 'DATE' | 'UNKNOWN';
  required: boolean;
  options?: string[];
  mapping?: string | null;
  characterLimit?: number;
}

export interface ApplicationPageSnapshotSummary {
  contentHash: string;
  sanitizedTextLength: number;
  httpStatus: number;
  fetchedAt: string;
  finalUrl: string;
  contentType?: string;
}

export interface ApplicationPageAnalysisDto {
  id: string;
  jobId: string;
  jobApplicationId?: string | null;

  schemaVersion: number;
  extractorVersion: string;
  extractionPolicyVersion: string;

  provider: ApplicationProvider;
  jobPageUrl: string;
  applicationUrl?: string | null;

  jobPageStatus: JobPageStatus;
  formStatus: FormInspectionStatus;
  submissionCapability: SubmissionCapability;
  outcomeStatus: AnalysisOutcomeStatus;

  requirements: ExtractedRequirement[];
  fields: ExtractedApplicationField[];

  snapshot: ApplicationPageSnapshotSummary;
  freshness: AnalysisFreshness;

  idempotencyKey: string;
  analyzedAt: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyzeJobPageInput {
  userId: string;
  jobId: string;
  jobApplicationId?: string;
  forceRefresh?: boolean;
}

export interface PrepareApplicationInput {
  userId: string;
  jobId: string;
  jobApplicationId?: string;
  applyMode: ApplyMode;
  resumeVersionId?: string;
  allowMatchCompute?: boolean;
  forceRefreshAnalysis?: boolean;
}
