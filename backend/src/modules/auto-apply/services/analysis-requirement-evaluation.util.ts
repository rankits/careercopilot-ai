import { READINESS_REASON_CODES } from '@/modules/auto-apply/constants/readiness-reason-codes.js';
import type {
  ApplicationPageAnalysisDto,
  ExtractedRequirement,
} from '@/modules/auto-apply/types/application-page-analysis.types.js';
import type {
  ApplicationReadinessReason,
  ApplicationReadinessRuleResult,
} from '@/modules/auto-apply/types/application-readiness.types.js';

export interface AnalysisEvaluationCandidate {
  workRegionAnswer?: string | null;
  yearsOfExperienceAnswer?: string | null;
  mobileDesignAnswer?: string | null;
  portfolioUrl?: string | null;
  requiresSponsorship?: boolean | null;
}

export interface AnalysisEvaluationResult {
  reasons: ApplicationReadinessReason[];
  rules: Record<string, ApplicationReadinessRuleResult>;
}

function mayHardBlock(requirement: ExtractedRequirement): boolean {
  if (requirement.importance !== 'REQUIRED') return false;
  if (
    requirement.assertion !== 'REQUIRES' &&
    requirement.assertion !== 'DOES_NOT_ALLOW' &&
    requirement.assertion !== 'DOES_NOT_PROVIDE'
  ) {
    return false;
  }
  return (
    requirement.evidenceStrength === 'AUTHORITATIVE_STRUCTURED' ||
    requirement.evidenceStrength === 'EXPLICIT_TEXT'
  );
}

function normalizeRegionToken(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '_');
}

function regionCompatible(candidateRaw: string, requirement: ExtractedRequirement): boolean {
  const candidate = normalizeRegionToken(candidateRaw);
  const geographic = requirement.geographic;
  const allowed = new Set<string>();

  if (geographic?.explicitCountries?.length) {
    for (const country of geographic.explicitCountries) {
      allowed.add(normalizeRegionToken(country));
    }
  }
  if (geographic?.normalizedRegion) {
    allowed.add(normalizeRegionToken(geographic.normalizedRegion));
  }
  if (Array.isArray(requirement.value)) {
    for (const item of requirement.value) {
      allowed.add(normalizeRegionToken(String(item)));
    }
  }

  if (allowed.has(candidate)) return true;

  // Conservative: INDIA is never compatible with NORTH_AMERICA / US-only.
  if (
    (allowed.has('NORTH_AMERICA') || allowed.has('UNITED_STATES') || allowed.has('US')) &&
    (candidate === 'INDIA' || candidate === 'IN' || candidate.includes('ASIA'))
  ) {
    return false;
  }

  // If interpretation still needs review, unknown candidate regions should not auto-pass.
  if (geographic?.interpretationStatus === 'REVIEW_REQUIRED') {
    return allowed.has(candidate);
  }

  return allowed.has(candidate);
}

/**
 * Compares extracted job requirements to verified candidate facts.
 * Analyzer never emits NOT_ELIGIBLE — only this evaluator (used by readiness).
 */
export function evaluateAnalysisAgainstCandidate(
  analysis: ApplicationPageAnalysisDto | null,
  candidate: AnalysisEvaluationCandidate,
  options?: { requireFreshForAutopilot?: boolean; now?: Date },
): AnalysisEvaluationResult {
  const reasons: ApplicationReadinessReason[] = [];
  const rules: Record<string, ApplicationReadinessRuleResult> = {};
  const now = options?.now ?? new Date();

  if (!analysis) {
    reasons.push({
      code: READINESS_REASON_CODES.ANALYSIS_UNAVAILABLE,
      message:
        'Job page analysis is not available yet. Prepare the application to extract job requirements.',
      rule: 'analysisAvailability',
      severity: 'WARNING',
      collectionMode: 'JOB_SPECIFIC',
    });
    rules.analysisAvailability = { status: 'UNKNOWN' };
    return { reasons, rules };
  }

  if (new Date(analysis.expiresAt) <= now || options?.requireFreshForAutopilot) {
    const requirementsAt = analysis.freshness.requirementsAnalyzedAt
      ? new Date(analysis.freshness.requirementsAnalyzedAt)
      : new Date(analysis.analyzedAt);
    const stale = requirementsAt.getTime() + 7 * 24 * 60 * 60 * 1000 <= now.getTime();
    if (stale || new Date(analysis.expiresAt) <= now) {
      reasons.push({
        code: READINESS_REASON_CODES.ANALYSIS_STALE,
        message: 'Job analysis is stale. Refresh Prepare Application before continuing.',
        rule: 'analysisFreshness',
        severity: options?.requireFreshForAutopilot ? 'BLOCKING' : 'WARNING',
        collectionMode: 'JOB_SPECIFIC',
        metadata: { analysisId: analysis.id, analyzedAt: analysis.analyzedAt },
      });
      rules.analysisFreshness = { status: 'FAILED' };
    } else {
      rules.analysisFreshness = { status: 'PASSED' };
    }
  } else {
    rules.analysisFreshness = { status: 'PASSED' };
  }

  rules.analysisAvailability = { status: 'PASSED', details: { analysisId: analysis.id } };

  // Provider detection never authorizes API submit.
  if (analysis.submissionCapability === 'AUTHORIZED_API') {
    // Defensive: analyzer must not claim authorized API in Phase 1.
    reasons.push({
      code: READINESS_REASON_CODES.CHANNEL_UNSUPPORTED,
      message: 'Authorized API submission is not available for this provider.',
      rule: 'analysisChannel',
      severity: 'BLOCKING',
    });
    rules.analysisChannel = { status: 'FAILED' };
  } else {
    rules.analysisChannel = {
      status: 'PASSED',
      details: {
        provider: analysis.provider,
        submissionCapability: analysis.submissionCapability,
        formStatus: analysis.formStatus,
      },
    };
  }

  for (const requirement of analysis.requirements) {
    if (!mayHardBlock(requirement) && requirement.evidenceStrength === 'WEAK_INFERENCE') {
      reasons.push({
        code: `ANALYSIS_WEAK_${requirement.code}`,
        message: `Possible requirement (${requirement.code}) was inferred weakly and will not block.`,
        rule: 'analysisWeakInference',
        severity: 'WARNING',
        collectionMode: 'JOB_SPECIFIC',
        metadata: {
          evidence: requirement.sourceText,
          confidence: requirement.confidence,
          analysisId: analysis.id,
        },
      });
      continue;
    }

    if (requirement.code === 'WORK_REGION' && mayHardBlock(requirement)) {
      const region = candidate.workRegionAnswer?.trim();
      if (!region) {
        reasons.push({
          code: READINESS_REASON_CODES.WORK_REGION_VERIFICATION_REQUIRED,
          message:
            'Confirm your current work region. This job restricts where candidates may be based.',
          field: 'currentWorkRegion',
          rule: 'analysisWorkRegion',
          severity: 'BLOCKING',
          collectionMode: 'JOB_SPECIFIC',
          metadata: {
            evidence: requirement.sourceText,
            jobValue: requirement.value,
            confidence: requirement.confidence,
            analysisId: analysis.id,
          },
        });
        rules.analysisWorkRegion = { status: 'FAILED' };
      } else if (!regionCompatible(region, requirement)) {
        reasons.push({
          code: READINESS_REASON_CODES.JOB_LOCATION_REQUIREMENT_NOT_MET,
          message:
            requirement.sourceText ??
            'This role is limited to candidates in the required work region.',
          field: 'currentWorkRegion',
          rule: 'analysisWorkRegion',
          severity: 'BLOCKING',
          collectionMode: 'JOB_SPECIFIC',
          metadata: {
            evidence: requirement.sourceText,
            jobValue: requirement.value,
            candidateValue: region,
            confidence: requirement.confidence,
            decision: 'NOT_ELIGIBLE',
            analysisId: analysis.id,
          },
        });
        rules.analysisWorkRegion = { status: 'FAILED' };
      } else {
        rules.analysisWorkRegion = { status: 'PASSED' };
      }
    }

    if (requirement.code === 'TOTAL_EXPERIENCE_YEARS' && mayHardBlock(requirement)) {
      const raw = candidate.yearsOfExperienceAnswer?.trim();
      const requiredYears = Number(requirement.value);
      if (!raw) {
        reasons.push({
          code: READINESS_REASON_CODES.EXPERIENCE_REQUIREMENT_UNKNOWN,
          message: `Confirm your years of experience. This role asks for at least ${requiredYears}+ years.`,
          field: 'yearsOfExperience',
          rule: 'analysisExperience',
          severity: 'BLOCKING',
          collectionMode: 'JOB_SPECIFIC',
          metadata: {
            evidence: requirement.sourceText,
            jobValue: requiredYears,
            confidence: requirement.confidence,
            analysisId: analysis.id,
          },
        });
        rules.analysisExperience = { status: 'FAILED' };
      } else {
        const years = Number.parseFloat(raw);
        if (!Number.isFinite(years) || years < requiredYears) {
          reasons.push({
            code: READINESS_REASON_CODES.EXPERIENCE_REQUIREMENT_NOT_MET,
            message: `This role requires at least ${requiredYears} years of experience.`,
            field: 'yearsOfExperience',
            rule: 'analysisExperience',
            severity: 'BLOCKING',
            collectionMode: 'JOB_SPECIFIC',
            metadata: {
              evidence: requirement.sourceText,
              jobValue: requiredYears,
              candidateValue: years,
              confidence: requirement.confidence,
              analysisId: analysis.id,
            },
          });
          rules.analysisExperience = { status: 'FAILED' };
        } else {
          rules.analysisExperience = { status: 'PASSED' };
        }
      }
    }

    if (requirement.code === 'MOBILE_DESIGN_EXPERIENCE' && mayHardBlock(requirement)) {
      const mobile = candidate.mobileDesignAnswer?.trim();
      if (!mobile) {
        reasons.push({
          code: READINESS_REASON_CODES.MOBILE_DESIGN_EVIDENCE_REQUIRED,
          message:
            'This role emphasizes mobile design experience. Confirm your mobile product-design background.',
          field: 'mobileDesignExperienceYears',
          rule: 'analysisMobileExperience',
          severity: 'BLOCKING',
          collectionMode: 'JOB_SPECIFIC',
          metadata: {
            evidence: requirement.sourceText,
            confidence: requirement.confidence,
            analysisId: analysis.id,
          },
        });
        rules.analysisMobileExperience = { status: 'FAILED' };
      } else {
        rules.analysisMobileExperience = { status: 'PASSED' };
      }
    }

    if (requirement.code === 'PORTFOLIO' && mayHardBlock(requirement)) {
      if (!candidate.portfolioUrl?.trim()) {
        reasons.push({
          code: READINESS_REASON_CODES.PORTFOLIO_EVIDENCE_REQUIRED,
          message: 'This role asks for a portfolio. Add a portfolio link before continuing.',
          field: 'portfolio',
          rule: 'analysisPortfolio',
          severity: 'BLOCKING',
          collectionMode: 'JOB_SPECIFIC',
          metadata: {
            evidence: requirement.sourceText,
            confidence: requirement.confidence,
            analysisId: analysis.id,
          },
        });
        rules.analysisPortfolio = { status: 'FAILED' };
      } else {
        rules.analysisPortfolio = { status: 'PASSED' };
      }
    }

    if (
      requirement.code === 'SPONSORSHIP' &&
      requirement.assertion === 'DOES_NOT_PROVIDE' &&
      candidate.requiresSponsorship === true
    ) {
      reasons.push({
        code: READINESS_REASON_CODES.SPONSORSHIP_JOB_REQUIREMENT_NOT_MET,
        message:
          requirement.sourceText ??
          'This employer does not provide sponsorship, and you indicated you need it.',
        field: 'requiresSponsorship',
        rule: 'analysisSponsorship',
        severity: 'BLOCKING',
        collectionMode: 'JOB_SPECIFIC',
        metadata: {
          evidence: requirement.sourceText,
          assertion: requirement.assertion,
          analysisId: analysis.id,
        },
      });
      rules.analysisSponsorship = { status: 'FAILED' };
    }
  }

  return { reasons, rules };
}
