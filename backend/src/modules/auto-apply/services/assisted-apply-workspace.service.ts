import { AppError } from '@/shared/utils/errors/AppError.js';
import type { IJobApplicationRepository } from '@/modules/auto-apply/contracts/job-application.contract.js';
import type { IApplicationPageAnalysisRepository } from '@/modules/auto-apply/contracts/application-page-analysis.contract.js';
import type { AssistedApplyWorkspaceDto } from '@/modules/auto-apply/types/assisted-apply-workspace.types.js';
import {
  WORKSPACE_STEP_IDS,
  type WorkspaceStepId,
} from '@/modules/auto-apply/types/assisted-apply-workspace.types.js';
import { buildWorkspaceDto } from '@/modules/auto-apply/utils/assisted-apply-workspace.util.js';
import { autoApplyEventService } from '@/modules/auto-apply/controllers/audit-event.controller.js';

export class AssistedApplyWorkspaceService {
  constructor(
    private readonly applications: IJobApplicationRepository,
    private readonly analysisRepository: IApplicationPageAnalysisRepository,
  ) {}

  async getWorkspace(userId: string, jobApplicationId: string): Promise<AssistedApplyWorkspaceDto> {
    const application = await this.applications.findById(userId, jobApplicationId);
    if (!application) {
      throw new AppError('Auto-apply submission not found', 404, 'APPLICATION_NOT_FOUND');
    }

    let analysisSummary: AssistedApplyWorkspaceDto['analysisSummary'] = null;
    let hasAnalysis = false;
    if (application.jobId) {
      const latest = await this.analysisRepository.findLatestByJobId(application.jobId);
      if (latest) {
        hasAnalysis = true;
        analysisSummary = {
          id: latest.id,
          outcomeStatus: latest.outcomeStatus,
          analyzedAt: latest.analyzedAt,
        };
      }
    }

    return buildWorkspaceDto({ application, hasAnalysis, analysisSummary });
  }

  async updateProgressStep(
    userId: string,
    jobApplicationId: string,
    progressStep: string,
  ): Promise<{ progressStep: WorkspaceStepId }> {
    if (!WORKSPACE_STEP_IDS.includes(progressStep as WorkspaceStepId)) {
      throw new AppError('Invalid workspace step', 400, 'INVALID_PROGRESS_STEP');
    }

    const existing = await this.applications.findById(userId, jobApplicationId);
    if (!existing) {
      throw new AppError('Auto-apply submission not found', 404, 'APPLICATION_NOT_FOUND');
    }

    const previousStep = existing.progressStep;
    const updated = await this.applications.updateProgressStep(
      userId,
      jobApplicationId,
      progressStep,
    );

    // AA-063: emit RESUME_CONFIRMED once when transitioning into "open"
    if (progressStep === 'open' && previousStep !== 'open') {
      void autoApplyEventService.record({
        userId,
        jobApplicationId,
        eventType: 'RESUME_CONFIRMED',
        metadata: {
          resumeVersionId: existing.resumeVersionId,
        },
      });
    }

    return { progressStep: updated.progressStep as WorkspaceStepId };
  }
}
