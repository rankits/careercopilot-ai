import { AppError } from '@/shared/utils/errors/AppError.js';
import type { IJobApplicationRepository } from '@/modules/auto-apply/contracts/job-application.contract.js';
import { autoApplyEventService } from '@/modules/auto-apply/controllers/audit-event.controller.js';
import type { JobApplicationStatusValue } from '@/modules/auto-apply/types/job-application.types.js';
import { toAssistedApplyViewState } from '@/modules/auto-apply/utils/assisted-apply-workspace.util.js';

export const ABANDON_REASON_CODES = [
  'NOT_INTERESTED',
  'TOO_MANY_REQUIREMENTS',
  'BROKEN_LINK',
  'JOB_CLOSED',
  'WILL_APPLY_LATER',
  'OTHER',
] as const;

export type AbandonReasonCode = (typeof ABANDON_REASON_CODES)[number];

const TERMINAL_NO_ABANDON: JobApplicationStatusValue[] = ['SUBMITTED', 'CONFIRMATION_RECEIVED'];

export class AssistedApplyCompletionService {
  constructor(private readonly applications: IJobApplicationRepository) {}

  async markApplied(
    userId: string,
    jobApplicationId: string,
    input?: { appliedAt?: string; notes?: string },
  ): Promise<{ status: string; appliedAt: string; viewState: string }> {
    const application = await this.applications.findById(userId, jobApplicationId);
    if (!application) {
      throw new AppError('Auto-apply submission not found', 404, 'APPLICATION_NOT_FOUND');
    }

    const notes =
      typeof input?.notes === 'string' ? input.notes.trim().slice(0, 2000) || null : null;
    const appliedAt = input?.appliedAt ? new Date(input.appliedAt) : new Date();
    if (Number.isNaN(appliedAt.getTime())) {
      throw new AppError('Invalid appliedAt date', 400, 'INVALID_APPLIED_AT');
    }

    // Idempotent if already SUBMITTED / CONFIRMATION_RECEIVED
    if (application.status === 'SUBMITTED' || application.status === 'CONFIRMATION_RECEIVED') {
      const updated = await this.applications.updateAppliedDetails(userId, jobApplicationId, {
        submittedAt: appliedAt,
        appliedNotes: notes ?? application.appliedNotes,
      });
      return {
        status: 'APPLIED',
        appliedAt: (updated.submittedAt ?? appliedAt).toISOString(),
        viewState: 'APPLIED',
      };
    }

    const isOpened =
      application.status === 'ACTION_REQUIRED' && Boolean(application.handoffOpenedAt);
    if (!isOpened) {
      throw new AppError('Open the application before marking as applied.', 409, 'INVALID_STATE');
    }

    const updated =
      (await this.applications.markApplied(
        userId,
        jobApplicationId,
        { submittedAt: appliedAt, appliedNotes: notes },
        'ACTION_REQUIRED',
      )) ?? (await this.applications.findById(userId, jobApplicationId));

    if (!updated || updated.status !== 'SUBMITTED') {
      // Race: another request may have transitioned — reload
      const current = await this.applications.findById(userId, jobApplicationId);
      if (current?.status === 'SUBMITTED' || current?.status === 'CONFIRMATION_RECEIVED') {
        return {
          status: 'APPLIED',
          appliedAt: (current.submittedAt ?? appliedAt).toISOString(),
          viewState: 'APPLIED',
        };
      }
      throw new AppError('Open the application before marking as applied.', 409, 'INVALID_STATE');
    }

    void autoApplyEventService.record({
      userId,
      jobApplicationId,
      eventType: 'MARKED_APPLIED',
      metadata: {},
    });

    return {
      status: 'APPLIED',
      appliedAt: (updated.submittedAt ?? appliedAt).toISOString(),
      viewState: toAssistedApplyViewState(updated.status),
    };
  }

  async abandon(
    userId: string,
    jobApplicationId: string,
    input: { reasonCode: string; note?: string },
  ): Promise<{ status: string; abandonReason: string }> {
    const reasonCode = String(input.reasonCode ?? '').toUpperCase();
    if (!ABANDON_REASON_CODES.includes(reasonCode as AbandonReasonCode)) {
      throw new AppError('Invalid or missing abandon reasonCode', 400, 'INVALID_ABANDON_REASON');
    }
    const note = typeof input.note === 'string' ? input.note.trim().slice(0, 2000) || null : null;

    const application = await this.applications.findById(userId, jobApplicationId);
    if (!application) {
      throw new AppError('Auto-apply submission not found', 404, 'APPLICATION_NOT_FOUND');
    }

    let targetStatus: JobApplicationStatusValue = 'WITHDRAWN';
    if (reasonCode === 'BROKEN_LINK') targetStatus = 'COULD_NOT_APPLY';
    if (reasonCode === 'JOB_CLOSED') targetStatus = 'JOB_CLOSED';

    if (application.status === targetStatus) {
      return {
        status: targetStatus,
        abandonReason: application.abandonReason ?? reasonCode,
      };
    }

    if (TERMINAL_NO_ABANDON.includes(application.status)) {
      throw new AppError(
        'This application can no longer be abandoned.',
        409,
        'INVALID_STATUS_TRANSITION',
      );
    }

    const updated = await this.applications.abandonApplication(
      userId,
      jobApplicationId,
      { abandonReason: reasonCode, abandonNote: note, targetStatus },
      application.status,
    );

    if (!updated) {
      const current = await this.applications.findById(userId, jobApplicationId);
      if (current?.status === targetStatus) {
        return {
          status: targetStatus,
          abandonReason: current.abandonReason ?? reasonCode,
        };
      }
      throw new AppError(
        'This application can no longer be abandoned.',
        409,
        'INVALID_STATUS_TRANSITION',
      );
    }

    void autoApplyEventService.record({
      userId,
      jobApplicationId,
      eventType: 'SUBMISSION_WITHDRAWN',
      metadata: { reasonCode, kind: 'application_abandoned', targetStatus },
    });

    return { status: targetStatus, abandonReason: reasonCode };
  }

  async reportBrokenLink(
    userId: string,
    jobApplicationId: string,
  ): Promise<{ reported: true; reportedAt: string }> {
    const application = await this.applications.findById(userId, jobApplicationId);
    if (!application) {
      throw new AppError('Auto-apply submission not found', 404, 'APPLICATION_NOT_FOUND');
    }

    const reportedAt = new Date();
    void autoApplyEventService.record({
      userId,
      jobApplicationId,
      eventType: 'BROKEN_LINK_REPORTED',
      metadata: {},
    });

    return { reported: true, reportedAt: reportedAt.toISOString() };
  }
}
