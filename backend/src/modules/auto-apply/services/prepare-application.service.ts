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

/**
 * Orchestrates analyze → optional match (consent-gated) → readiness → package stub.
 * Does not submit applications.
 */
export class PrepareApplicationService implements IPrepareApplicationService {
  constructor(
    private readonly analyzer: IJobPageAnalyzerService,
    private readonly matchPort: IApplicationMatchPort,
    private readonly readiness: IApplicationReadinessService,
    private readonly jobApplications: IJobApplicationRepository,
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

    if (
      match.overallScore != null &&
      input.jobApplicationId &&
      (match.status === 'READY' || match.status === 'CACHED')
    ) {
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
      overallScore: match.overallScore,
    };

    return {
      analysis,
      match,
      readiness,
      package: pkg,
      application: application ?? null,
    };
  }
}
