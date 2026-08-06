import { termAppearsIn } from '@/modules/resume-analysis/utils/text-match.js';
import {
  classifyRequirementDomain,
  humanizeRequirementCode,
  REQUIREMENT_CLASSIFIER_VERSION,
  type RequirementDomain,
} from '@/modules/auto-apply/utils/requirement-domain.util.js';
import {
  extractJobKeywords,
  KEYWORD_EXTRACTOR_VERSION,
} from '@/modules/auto-apply/utils/resume-keyword-extract.util.js';

export const RESUME_JOB_ANALYZER_SCHEMA_VERSION = 2;
export const RESUME_JOB_ANALYZER_PROMPT_VERSION = 'deterministic-evidence-v2';
export const RESUME_JOB_ANALYZER_VERSION = 'resume-evidence-v2';

export type NormalizedJobRequirement = {
  code: string;
  assertion?: string | null;
  sourceText?: string | null;
  required?: boolean;
  importance?: 'REQUIRED' | 'PREFERRED' | 'OPTIONAL' | string | null;
  confidence?: number | null;
  value?: unknown;
};

export type ResumeJobAnalysisInput = {
  resumeText: string;
  jobTitle: string;
  jobDescription: string;
  requirements: NormalizedJobRequirement[];
  jobAnalysisLimited?: boolean;
};

export type ResumeAnalysisFinding = {
  code: string;
  title: string;
  explanation: string;
  resumeEvidence: string[];
  jobRequirementCodes: string[];
  severity?: 'HIGH' | 'MEDIUM' | 'LOW';
  profileEvidenceAvailable?: boolean;
  suggestedResumeSections?: string[];
};

export type KeywordMatch = {
  term: string;
  resumeEvidence: string[];
  requirementCodes: string[];
};

export type KeywordGap = {
  term: string;
  required: boolean;
  requirementCodes: string[];
};

export type ResumeJobAnalysisResult = {
  /** FE-compatible flattened strings */
  strengths: string[];
  concerns: string[];
  missingEvidence: string[];
  unknowns: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'COMPLETE' | 'LIMITED' | 'FAILED';
  keywords: {
    matched: string[];
    missing: string[];
    optional: string[];
    matchedDetailed: KeywordMatch[];
    missingDetailed: KeywordGap[];
    optionalDetailed: KeywordGap[];
  };
  overallAlignment: number | null;
  summary: {
    criteriaAnalyzed: number;
    requiredCriteriaAnalyzed: number;
    criteriaWithEvidence: number;
    criteriaMissingEvidence: number;
    criteriaUnknown: number;
  };
  strengthsDetailed: ResumeAnalysisFinding[];
  missingEvidenceDetailed: ResumeAnalysisFinding[];
  concernsDetailed: ResumeAnalysisFinding[];
  unknownsDetailed: ResumeAnalysisFinding[];
  excludedRequirements: Array<{
    code: string;
    domain: Exclude<RequirementDomain, 'RESUME_EVIDENCE'>;
    reason: string;
  }>;
  warnings: Array<{ code: string; message: string }>;
  schemaVersion: number;
  promptVersion: string;
  analyzerVersion: string;
  classifierVersion: string;
  keywordExtractorVersion: string;
};

function findEvidenceSnippets(resumeText: string, terms: string[]): string[] {
  const lines = resumeText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 12);
  const hits: string[] = [];
  for (const line of lines) {
    if (terms.some((term) => termAppearsIn(line, term))) {
      hits.push(line.length > 180 ? `${line.slice(0, 177)}…` : line);
    }
    if (hits.length >= 2) break;
  }
  return hits;
}

function meaningfulTermsFromRequirement(req: NormalizedJobRequirement, title: string): string[] {
  const fromSource = extractJobKeywords({
    // Prefer posting evidence over humanized titles (titles add noise like "total").
    requirementTexts: [req.sourceText ?? ''],
    jobTitle: '',
    jobDescription: '',
  });
  // Keep title keywords only when source text is thin.
  const fallback =
    fromSource.length === 0
      ? extractJobKeywords({ requirementTexts: [title] })
      : [];
  return [...new Set([...fromSource, ...fallback])].filter((t) => t.length > 1);
}

function formatStrength(finding: ResumeAnalysisFinding): string {
  const evidence = finding.resumeEvidence[0]
    ? ` Evidence: “${finding.resumeEvidence[0]}”.`
    : '';
  return `${finding.title}: ${finding.explanation}${evidence}`;
}

function formatMissing(finding: ResumeAnalysisFinding): string {
  return `${finding.title}: ${finding.explanation}`;
}

/**
 * Shared resume↔job analyzer for Assisted Apply.
 * Eligibility-only requirements are excluded. Scores only RESUME_EVIDENCE criteria.
 */
export class ResumeJobAnalyzer {
  analyze(input: ResumeJobAnalysisInput): ResumeJobAnalysisResult {
    const resumeText = input.resumeText?.trim() ?? '';
    const warnings: ResumeJobAnalysisResult['warnings'] = [];
    const excludedRequirements: ResumeJobAnalysisResult['excludedRequirements'] = [];

    const resumeRelevant: Array<NormalizedJobRequirement & { title: string }> = [];

    for (const req of input.requirements) {
      const domain = classifyRequirementDomain({
        code: req.code,
        sourceText: req.sourceText,
        assertion: req.assertion,
      });
      if (domain !== 'RESUME_EVIDENCE') {
        excludedRequirements.push({
          code: req.code,
          domain: domain === 'RESUME_EVIDENCE' ? 'UNKNOWN' : domain,
          reason:
            domain === 'CANDIDATE_ELIGIBILITY'
              ? 'Evaluated in Fit & Eligibility, not Resume Match.'
              : domain === 'APPLICATION_FORM'
                ? 'Application-form item; not resume evidence.'
                : 'Requirement domain is unclear; excluded from resume score.',
        });
        continue;
      }
      resumeRelevant.push({
        ...req,
        title: humanizeRequirementCode(req.code),
      });
    }

    const emptySummary = {
      criteriaAnalyzed: 0,
      requiredCriteriaAnalyzed: 0,
      criteriaWithEvidence: 0,
      criteriaMissingEvidence: 0,
      criteriaUnknown: 0,
    };

    if (!resumeText) {
      return this.buildResult({
        status: 'LIMITED',
        overallAlignment: null,
        confidence: 'LOW',
        summary: emptySummary,
        strengthsDetailed: [],
        missingEvidenceDetailed: [],
        concernsDetailed: [],
        unknownsDetailed: [
          {
            code: 'RESUME_TEXT_EMPTY',
            title: 'Resume text unavailable',
            explanation: 'Resume body text was empty — analysis confidence is limited.',
            resumeEvidence: [],
            jobRequirementCodes: [],
          },
        ],
        keywords: { matched: [], missing: [], optional: [], matchedDetailed: [], missingDetailed: [], optionalDetailed: [] },
        excludedRequirements,
        warnings: [
          {
            code: 'RESUME_TEXT_EMPTY',
            message: 'No resume body text was available for comparison.',
          },
        ],
      });
    }

    if (resumeRelevant.length === 0) {
      warnings.push({
        code: 'NO_RESUME_RELEVANT_REQUIREMENTS',
        message:
          'The job analysis did not contain enough resume-relevant requirements for a reliable comparison.',
      });
      return this.buildResult({
        status: 'LIMITED',
        overallAlignment: null,
        confidence: 'LOW',
        summary: emptySummary,
        strengthsDetailed: [],
        missingEvidenceDetailed: [],
        concernsDetailed: [],
        unknownsDetailed: [
          {
            code: 'NO_RESUME_RELEVANT_REQUIREMENTS',
            title: 'Limited resume-relevant requirements',
            explanation:
              'We did not have enough resume-relevant job requirements to identify reliable strengths.',
            resumeEvidence: [],
            jobRequirementCodes: [],
          },
        ],
        keywords: {
          matched: [],
          missing: [],
          optional: [],
          matchedDetailed: [],
          missingDetailed: [],
          optionalDetailed: [],
        },
        excludedRequirements,
        warnings,
      });
    }

    const strengthsDetailed: ResumeAnalysisFinding[] = [];
    const missingEvidenceDetailed: ResumeAnalysisFinding[] = [];
    const concernsDetailed: ResumeAnalysisFinding[] = [];
    const unknownsDetailed: ResumeAnalysisFinding[] = [];

    let weightedTotal = 0;
    let weightedEarned = 0;
    let requiredAnalyzed = 0;
    let withEvidence = 0;
    let missingCount = 0;
    let unknownCount = 0;

    const matchedDetailed: KeywordMatch[] = [];
    const missingDetailed: KeywordGap[] = [];
    const optionalDetailed: KeywordGap[] = [];

    for (const req of resumeRelevant) {
      const title = req.title;
      const terms = meaningfulTermsFromRequirement(req, title);
      const isRequired =
        req.required !== false &&
        (req.importance == null || req.importance === 'REQUIRED' || req.importance === 'REQUIRES');
      const weight = isRequired ? 1 : 0.55;
      if (isRequired) requiredAnalyzed += 1;
      weightedTotal += weight;

      if (terms.length === 0) {
        unknownCount += 1;
        unknownsDetailed.push({
          code: `UNKNOWN_${req.code}`,
          title,
          explanation: `Could not derive searchable keywords for “${title}” from the job posting evidence.`,
          resumeEvidence: [],
          jobRequirementCodes: [req.code],
        });
        continue;
      }

      const present = terms.filter((term) => termAppearsIn(resumeText, term));
      const evidence = findEvidenceSnippets(resumeText, present.length ? present : terms);
      const coverage = present.length / terms.length;

      if (coverage >= 0.34 && evidence.length > 0) {
        withEvidence += 1;
        weightedEarned += weight * Math.min(1, 0.5 + coverage);
        for (const term of present.slice(0, 5)) {
          if (!matchedDetailed.some((m) => m.term === term)) {
            matchedDetailed.push({
              term,
              resumeEvidence: findEvidenceSnippets(resumeText, [term]).slice(0, 1),
              requirementCodes: [req.code],
            });
          }
        }
        strengthsDetailed.push({
          code: `STRENGTH_${req.code}`,
          title,
          explanation: `The resume demonstrates evidence related to ${title.toLowerCase()}.`,
          resumeEvidence: evidence,
          jobRequirementCodes: [req.code],
        });
      } else if (coverage > 0 && evidence.length === 0) {
        unknownCount += 1;
        unknownsDetailed.push({
          code: `WEAK_SIGNAL_${req.code}`,
          title,
          explanation: `Possible mentions related to “${title}” were detected, but no clear supporting resume line was found.`,
          resumeEvidence: [],
          jobRequirementCodes: [req.code],
        });
      } else {
        missingCount += 1;
        for (const term of terms.slice(0, 4)) {
          const bucket = isRequired ? missingDetailed : optionalDetailed;
          if (!bucket.some((m) => m.term === term)) {
            bucket.push({ term, required: isRequired, requirementCodes: [req.code] });
          }
        }
        missingEvidenceDetailed.push({
          code: `MISSING_${req.code}`,
          title,
          explanation: `The job asks for ${title.toLowerCase()}, but the selected resume does not clearly demonstrate it. This does not mean you lack the qualification — only that evidence was not found in this resume.`,
          resumeEvidence: [],
          jobRequirementCodes: [req.code],
          profileEvidenceAvailable: false,
          suggestedResumeSections: ['Professional Experience', 'Projects', 'Skills'],
        });
        if (isRequired && coverage === 0) {
          concernsDetailed.push({
            code: `CONCERN_${req.code}`,
            title,
            explanation: `Required signal “${title}” has no clear supporting evidence on this resume.`,
            resumeEvidence: [],
            jobRequirementCodes: [req.code],
            severity: 'MEDIUM',
          });
        }
      }
    }

    // JD/tech keywords (resume-relevant only), never stopwords
    const corpusKeywords = extractJobKeywords({
      jobTitle: input.jobTitle,
      jobDescription: input.jobDescription,
      requirementTexts: resumeRelevant.map((r) => r.sourceText ?? r.title),
    });
    for (const term of corpusKeywords) {
      if (termAppearsIn(resumeText, term) && !matchedDetailed.some((m) => m.term === term)) {
        matchedDetailed.push({
          term,
          resumeEvidence: findEvidenceSnippets(resumeText, [term]).slice(0, 1),
          requirementCodes: [],
        });
      }
    }

    const overallAlignment =
      weightedTotal === 0 ? null : Math.round((weightedEarned / weightedTotal) * 100) / 100;

    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    if (
      input.jobAnalysisLimited ||
      resumeRelevant.length < 2 ||
      withEvidence === 0 ||
      unknownCount > withEvidence
    ) {
      confidence = 'LOW';
    } else if (
      resumeRelevant.length >= 3 &&
      withEvidence >= Math.ceil(resumeRelevant.length * 0.5) &&
      unknownCount <= 1
    ) {
      confidence = 'HIGH';
    }

    const status: 'COMPLETE' | 'LIMITED' =
      confidence === 'LOW' || resumeRelevant.length < 2 ? 'LIMITED' : 'COMPLETE';

    return this.buildResult({
      status,
      overallAlignment,
      confidence,
      summary: {
        criteriaAnalyzed: resumeRelevant.length,
        requiredCriteriaAnalyzed: requiredAnalyzed,
        criteriaWithEvidence: withEvidence,
        criteriaMissingEvidence: missingCount,
        criteriaUnknown: unknownCount,
      },
      strengthsDetailed: strengthsDetailed.slice(0, 12),
      missingEvidenceDetailed: missingEvidenceDetailed.slice(0, 12),
      concernsDetailed: concernsDetailed.slice(0, 12),
      unknownsDetailed: unknownsDetailed.slice(0, 8),
      keywords: {
        matched: matchedDetailed.map((m) => m.term).slice(0, 20),
        missing: missingDetailed.map((m) => m.term).slice(0, 20),
        optional: optionalDetailed.map((m) => m.term).slice(0, 12),
        matchedDetailed: matchedDetailed.slice(0, 20),
        missingDetailed: missingDetailed.slice(0, 20),
        optionalDetailed: optionalDetailed.slice(0, 12),
      },
      excludedRequirements,
      warnings,
    });
  }

  private buildResult(partial: {
    status: 'COMPLETE' | 'LIMITED' | 'FAILED';
    overallAlignment: number | null;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    summary: ResumeJobAnalysisResult['summary'];
    strengthsDetailed: ResumeAnalysisFinding[];
    missingEvidenceDetailed: ResumeAnalysisFinding[];
    concernsDetailed: ResumeAnalysisFinding[];
    unknownsDetailed: ResumeAnalysisFinding[];
    keywords: ResumeJobAnalysisResult['keywords'];
    excludedRequirements: ResumeJobAnalysisResult['excludedRequirements'];
    warnings: ResumeJobAnalysisResult['warnings'];
  }): ResumeJobAnalysisResult {
    return {
      status: partial.status,
      overallAlignment: partial.overallAlignment,
      confidence: partial.confidence,
      summary: partial.summary,
      strengthsDetailed: partial.strengthsDetailed,
      missingEvidenceDetailed: partial.missingEvidenceDetailed,
      concernsDetailed: partial.concernsDetailed,
      unknownsDetailed: partial.unknownsDetailed,
      strengths: partial.strengthsDetailed.map(formatStrength),
      concerns: partial.concernsDetailed.map(formatMissing),
      missingEvidence: partial.missingEvidenceDetailed.map(formatMissing),
      unknowns: partial.unknownsDetailed.map((u) => `${u.title}: ${u.explanation}`),
      keywords: partial.keywords,
      excludedRequirements: partial.excludedRequirements,
      warnings: partial.warnings,
      schemaVersion: RESUME_JOB_ANALYZER_SCHEMA_VERSION,
      promptVersion: RESUME_JOB_ANALYZER_PROMPT_VERSION,
      analyzerVersion: RESUME_JOB_ANALYZER_VERSION,
      classifierVersion: REQUIREMENT_CLASSIFIER_VERSION,
      keywordExtractorVersion: KEYWORD_EXTRACTOR_VERSION,
    };
  }
}

export const resumeJobAnalyzer = new ResumeJobAnalyzer();
