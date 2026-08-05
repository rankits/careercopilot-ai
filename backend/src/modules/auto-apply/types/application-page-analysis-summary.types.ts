import type {
  ApplicationPageAnalysisDto,
  ExtractedRequirement,
} from '@/modules/auto-apply/types/application-page-analysis.types.js';

/** Lean analysis payload for Prepare / plan UI (no sanitized text). */
export interface ApplicationPageAnalysisSummary {
  id: string;
  provider: string;
  submissionCapability: string;
  formStatus: string;
  outcomeStatus: string;
  jobPageUrl: string;
  analyzedAt: string;
  expiresAt: string;
  requirements: ApplicationPageRequirementSummary[];
}

export interface ApplicationPageRequirementSummary {
  code: string;
  importance: string;
  assertion: string;
  required: boolean;
  confidence: number;
  evidenceStrength: string;
  sourceText?: string;
  reviewStatus?: string;
}

function toRequirementSummary(requirement: ExtractedRequirement): ApplicationPageRequirementSummary {
  return {
    code: requirement.code,
    importance: requirement.importance,
    assertion: requirement.assertion,
    required: requirement.required,
    confidence: requirement.confidence,
    evidenceStrength: requirement.evidenceStrength,
    sourceText: requirement.sourceText,
    reviewStatus: requirement.reviewStatus,
  };
}

export function toApplicationPageAnalysisSummary(
  analysis: ApplicationPageAnalysisDto | null | undefined,
): ApplicationPageAnalysisSummary | null {
  if (!analysis) return null;
  return {
    id: analysis.id,
    provider: analysis.provider,
    submissionCapability: analysis.submissionCapability,
    formStatus: analysis.formStatus,
    outcomeStatus: analysis.outcomeStatus,
    jobPageUrl: analysis.jobPageUrl,
    analyzedAt: analysis.analyzedAt,
    expiresAt: analysis.expiresAt,
    requirements: analysis.requirements.map(toRequirementSummary),
  };
}
