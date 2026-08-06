import type {
  IJobPageAnalyzerService,
  IPrepareApplicationService,
  PrepareApplicationResult,
  ApplicationPackageStub,
} from '@/modules/auto-apply/contracts/application-page-analysis.contract.js';
import type { IApplicationMatchPort } from '@/modules/auto-apply/contracts/application-match.contract.js';
import type { IApplicationReadinessService } from '@/modules/auto-apply/contracts/application-readiness.contract.js';
import type { IJobApplicationRepository } from '@/modules/auto-apply/contracts/job-application.contract.js';
import type { PrepareApplicationInput } from '@/modules/auto-apply/types/application-page-analysis.types.js';
import { applyModeToMatchTrigger } from '@/modules/auto-apply/types/application-match.types.js';
import type { ProfileJobMatchService } from '@/modules/auto-apply/services/profile-job-match.service.js';
import type { ProfileJobMatchResult } from '@/modules/auto-apply/types/profile-job-match.types.js';

/**
 * Orchestrates analyze → profile match → optional recommendation context → readiness → package.
 * Does not submit applications. Does not use resume content for profile match.
 */
export class PrepareApplicationService implements IPrepareApplicationService {
  constructor(
    private readonly analyzer: IJobPageAnalyzerService,
    private readonly matchPort: IApplicationMatchPort,
    private readonly readiness: IApplicationReadinessService,
    private readonly jobApplications: IJobApplicationRepository,
    private readonly profileJobMatch?: ProfileJobMatchService,
  ) {}

  async prepare(input: PrepareApplicationInput): Promise<PrepareApplicationResult> {
    const analysis = await this.analyzer.analyzeOrGetFresh({
      userId: input.userId,
      jobId: input.jobId,
      jobApplicationId: input.jobApplicationId,
      forceRefresh: input.forceRefreshAnalysis,
    });

    const requiredSkills = analysis.requirements
      .filter((requirement) => requirement.importance === 'REQUIRED')
      .map((requirement) => requirement.code);

    // Recommendation cache — historical/fallback context only (not authoritative Fit match).
    const match = await this.matchPort.ensureMatch({
      userId: input.userId,
      jobId: input.jobId,
      jobApplicationId: input.jobApplicationId,
      analysisId: analysis.id,
      resumeVersionId: input.resumeVersionId,
      trigger: applyModeToMatchTrigger(input.applyMode),
      applyMode: input.applyMode,
      allowCompute: input.allowMatchCompute ?? false,
      jobHints: {
        descriptionText: undefined,
        requiredSkills,
      },
    });

    let profileMatch: ProfileJobMatchResult | null = null;
    if (this.profileJobMatch && input.jobApplicationId) {
      profileMatch = await this.profileJobMatch.ensureMatch({
        userId: input.userId,
        jobId: input.jobId,
        jobApplicationId: input.jobApplicationId,
        analysis,
        recommendationScoreFallback: match.overallScore,
        forceRefresh: input.forceRefreshAnalysis,
      });

      // Stamp application matchScore from profile alignment (0..1), not recommendation cache.
      if (profileMatch.overallAlignment != null) {
        await this.jobApplications.updateMatchScore(
          input.userId,
          input.jobApplicationId,
          profileMatch.overallAlignment,
        );
      }
    } else if (
      match.overallScore != null &&
      input.jobApplicationId &&
      (match.status === 'READY' || match.status === 'CACHED')
    ) {
      // Fallback only when profile matcher is unavailable.
      await this.jobApplications.updateMatchScore(
        input.userId,
        input.jobApplicationId,
        match.overallScore,
      );
    }

    const application = input.jobApplicationId
      ? await this.jobApplications.findById(input.userId, input.jobApplicationId)
      : await this.jobApplications.findByUserIdAndJobId(input.userId, input.jobId);

    const readiness = await this.readiness.evaluate({
      userId: input.userId,
      jobId: input.jobId,
      jobApplicationId: application?.id ?? input.jobApplicationId,
      stage: input.applyMode === 'AUTOPILOT' ? 'QUEUE' : 'PLAN',
      applyMode: input.applyMode,
      applicationAnalysisId: analysis.id,
    });

    const pkg: ApplicationPackageStub = {
      provider: analysis.provider,
      submissionMode:
        analysis.submissionCapability === 'EXTERNAL_MANUAL'
          ? 'EXTERNAL_MANUAL'
          : analysis.submissionCapability === 'BROWSER_ASSISTED'
            ? 'BROWSER_ASSISTED'
            : 'UNSUPPORTED',
      finalSubmissionRequiresUser: true,
      selectedResumeId: match.resumeVersionId ?? null,
      analysisId: analysis.id,
      matchStatus: match.status,
      overallScore: profileMatch?.overallAlignment ?? null,
      profileMatch,
      recommendationScoreFallback: match.overallScore,
    };

    return {
      analysis,
      match,
      profileMatch,
      readiness,
      package: pkg,
      application: application ?? null,
    };
  }
}
