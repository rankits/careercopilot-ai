import type { IApplicationMatchPort } from '@/modules/auto-apply/contracts/application-match.contract.js';
import type {
  ApplicationMatchSnapshot,
  EnsureApplicationMatchInput,
} from '@/modules/auto-apply/types/application-match.types.js';
import type { IMatchScoreLookup } from '@/modules/auto-apply/contracts/application-readiness.contract.js';
import type { IApplicationConsentRepository } from '@/modules/auto-apply/contracts/application-consent.contract.js';
import type { IApprovedResumeVersionRepository } from '@/modules/auto-apply/contracts/resume-version.contract.js';

/**
 * Phase-1 adapter: returns cached recommendation score only.
 * Does not invoke scoring engines — keeps Auto Apply insulated from matcher churn.
 */
export class RecommendationsMatchAdapter implements IApplicationMatchPort {
  constructor(
    private readonly matchScoreLookup: IMatchScoreLookup,
    private readonly consentRepository: IApplicationConsentRepository,
    private readonly resumeVersions: IApprovedResumeVersionRepository,
  ) {}

  async getLatest(userId: string, jobId: string): Promise<ApplicationMatchSnapshot | null> {
    const score = await this.matchScoreLookup.findOverallScore(userId, jobId);
    if (score == null) return null;
    return {
      status: 'CACHED',
      overallScore: score,
      displayScore: Math.round(score * 100),
      jobId,
      source: 'RECOMMENDATIONS',
      computedAt: new Date(),
    };
  }

  async ensureMatch(input: EnsureApplicationMatchInput): Promise<ApplicationMatchSnapshot> {
    const consent = await this.consentRepository.findActiveByType(input.userId, 'RESUME_USAGE');
    if (!consent) {
      return {
        status: 'SKIPPED_NO_CONSENT',
        overallScore: null,
        displayScore: null,
        jobId: input.jobId,
        analysisId: input.analysisId,
        source: 'NONE',
        errorCode: 'MATCH_CONSENT_REQUIRED',
      };
    }

    const resumes = await this.resumeVersions.findManyByUserId(input.userId);
    if (!resumes.some((resume) => resume.isActive)) {
      return {
        status: 'SKIPPED_NO_RESUME',
        overallScore: null,
        displayScore: null,
        jobId: input.jobId,
        analysisId: input.analysisId,
        source: 'NONE',
        errorCode: 'RESUME_MISSING',
      };
    }

    const score = await this.matchScoreLookup.findOverallScore(input.userId, input.jobId);
    if (score == null) {
      return {
        status: input.allowCompute === false ? 'SKIPPED_FEATURE' : 'PENDING',
        overallScore: null,
        displayScore: null,
        jobId: input.jobId,
        analysisId: input.analysisId,
        resumeVersionId: input.resumeVersionId ?? resumes.find((r) => r.isActive)?.id,
        source: 'NONE',
        errorCode: 'MATCH_SCORE_MISSING',
      };
    }

    return {
      status: 'CACHED',
      overallScore: score,
      displayScore: Math.round(score * 100),
      jobId: input.jobId,
      analysisId: input.analysisId,
      resumeVersionId: input.resumeVersionId ?? resumes.find((r) => r.isActive)?.id,
      source: 'RECOMMENDATIONS',
      computedAt: new Date(),
    };
  }
}
