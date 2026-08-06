import { AppError } from '@/shared/utils/errors/AppError.js';
import { prisma } from '@/shared/config/db.conf.js';
import type { IJobApplicationRepository } from '@/modules/auto-apply/contracts/job-application.contract.js';
import type { IApplicationPageAnalysisRepository } from '@/modules/auto-apply/contracts/application-page-analysis.contract.js';
import type { IProfileJobMatchRepository } from '@/modules/auto-apply/repositories/prisma-profile-job-match.repository.js';
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
    private readonly profileMatches?: IProfileJobMatchRepository,
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

    const profileMatchRecord = this.profileMatches
      ? await this.profileMatches.findByJobApplicationId(userId, jobApplicationId)
      : null;

    const jobSummary = application.jobId ? await this.loadJobSummary(application.jobId) : null;

    return buildWorkspaceDto({
      application,
      hasAnalysis,
      analysisSummary,
      profileMatch: profileMatchRecord?.result ?? null,
      jobSummary,
    });
  }

  /** Job-card display fields only; a lookup failure must not break the workspace. */
  private async loadJobSummary(
    jobId: string,
  ): Promise<{ companyName: string | null; workplaceMode: string | null } | null> {
    try {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        select: { remoteType: true, company: { select: { name: true } } },
      });
      if (!job) return null;
      return {
        companyName: job.company?.name ?? null,
        workplaceMode: job.remoteType ?? null,
      };
    } catch {
      return null;
    }
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

    if (progressStep === 'open') {
      if (!existing.resumeVersionId) {
        throw new AppError(
          'Select an approved resume before continuing to Open Job Page.',
          400,
          'RESUME_SELECTION_REQUIRED',
        );
      }
    }

    const previousStep = existing.progressStep;
    const updated = await this.applications.updateProgressStep(
      userId,
      jobApplicationId,
      progressStep,
    );

    // AA-063: emit RESUME_CONFIRMED once when transitioning into "open"
    if (progressStep === 'open' && previousStep !== 'open') {
      if (!updated.resumeVersionId) {
        throw new AppError(
          'Select an approved resume before continuing to Open Job Page.',
          400,
          'RESUME_SELECTION_REQUIRED',
        );
      }
      void autoApplyEventService.record({
        userId,
        jobApplicationId,
        eventType: 'RESUME_CONFIRMED',
        metadata: {
          resumeVersionId: updated.resumeVersionId,
        },
      });
    }

    return { progressStep: updated.progressStep as WorkspaceStepId };
  }
}
