import { AppError } from '@/shared/utils/errors/AppError.js';
import { logger } from '@/shared/logger/logger.js';
import type { IJobApplicationRepository } from '@/modules/auto-apply/contracts/job-application.contract.js';
import type { IChannelDetectionJobLookup } from '@/modules/auto-apply/contracts/channel-detection.contract.js';
import type { IApplicationReadinessService } from '@/modules/auto-apply/contracts/application-readiness.contract.js';
import { ExternalRedirectAdapter } from '@/modules/auto-apply/adapters/external-redirect.adapter.js';
import { autoApplyEventService } from '@/modules/auto-apply/controllers/audit-event.controller.js';
import { toAssistedApplyViewState } from '@/modules/auto-apply/utils/assisted-apply-workspace.util.js';
import type { JobApplicationStatusValue } from '@/modules/auto-apply/types/job-application.types.js';
import { env } from '@/shared/config/env.conf.js';

export interface HandoffResult {
  applyUrl: string;
  openedAt: string;
  viewState: string;
}

const TERMINAL_BLOCKED: JobApplicationStatusValue[] = [
  'SUBMITTED',
  'CONFIRMATION_RECEIVED',
  'WITHDRAWN',
];

const HANDOFF_ELIGIBLE: JobApplicationStatusValue[] = [
  'DISCOVERED',
  'MATCHED',
  'APPLICATION_PLANNING',
  'INFORMATION_REQUIRED',
  'READY_FOR_REVIEW',
  'READY_FOR_AUTOPILOT',
  'APPROVED',
  'SUBMISSION_FAILED',
];

/**
 * AA-070: direct external handoff — never publishes to RabbitMQ.
 */
export class AssistedApplyHandoffService {
  private readonly redirectAdapter = new ExternalRedirectAdapter();

  constructor(
    private readonly applications: IJobApplicationRepository,
    private readonly channelJobLookup: IChannelDetectionJobLookup,
    private readonly readiness: IApplicationReadinessService,
    /** Optional queue publish spy target — must never be invoked on this path. */
    private readonly queuePublish?: { publish: (...args: unknown[]) => unknown },
  ) {}

  isDirectHandoffEnabled(): boolean {
    return env.ASSISTED_APPLY_DIRECT_HANDOFF !== false;
  }

  async handoff(
    userId: string,
    jobApplicationId: string,
    operationId?: string,
  ): Promise<HandoffResult> {
    if (!this.isDirectHandoffEnabled()) {
      throw new AppError('Direct handoff is not enabled', 503, 'HANDOFF_DISABLED');
    }

    const application = await this.applications.findById(userId, jobApplicationId);
    if (!application) {
      throw new AppError('Auto-apply submission not found', 404, 'APPLICATION_NOT_FOUND');
    }

    if (TERMINAL_BLOCKED.includes(application.status)) {
      throw new AppError(
        'This application can no longer be opened for handoff.',
        409,
        'INVALID_STATUS_TRANSITION',
      );
    }

    // Idempotent: already opened
    if (
      application.status === 'ACTION_REQUIRED' &&
      application.handoffOpenedAt &&
      (application.externalConfirmationUrl || application.jobId)
    ) {
      const applyUrl =
        application.externalConfirmationUrl ??
        (await this.resolveApplyUrl(application.jobId!));
      return {
        applyUrl,
        openedAt: application.handoffOpenedAt.toISOString(),
        viewState: 'OPENED',
      };
    }

    if (!HANDOFF_ELIGIBLE.includes(application.status) && application.status !== 'ACTION_REQUIRED') {
      throw new AppError(
        'This application is not ready for handoff.',
        409,
        'INVALID_STATUS_TRANSITION',
      );
    }

    if (!application.jobId) {
      throw new AppError('Job is missing for this application', 422, 'INVALID_APPLY_URL');
    }

    const readiness = await this.readiness.evaluate({
      userId,
      jobId: application.jobId,
      jobApplicationId,
      stage: 'HANDOFF',
      applyMode: 'ASSISTED',
    });

    if (!readiness.ready || readiness.blockingReasons.length > 0) {
      throw new AppError('Handoff is blocked', 409, 'HANDOFF_BLOCKED', {
        reasons: readiness.blockingReasons.map((r) => ({
          code: r.code,
          message: r.message,
        })),
      });
    }

    const applyUrl = await this.resolveApplyUrl(application.jobId);
    const validation = await this.redirectAdapter.validate({
      jobApplicationId,
      userId,
      jobId: application.jobId,
      externalApplyUrl: applyUrl,
    });

    if (!validation.valid) {
      throw new AppError(
        validation.issues[0] ?? 'Apply URL failed validation',
        422,
        'INVALID_APPLY_URL',
      );
    }

    // Architectural constraint: never publish to the submission queue.
    if (this.queuePublish) {
      logger.error(
        { jobApplicationId },
        'Handoff path incorrectly received a queue publisher — refusing to call it',
      );
    }

    const openedAt = new Date();
    const updated =
      (await this.applications.recordHandoffOpened(
        userId,
        jobApplicationId,
        { applyUrl, openedAt },
        application.status,
      )) ?? (await this.applications.findById(userId, jobApplicationId));

    if (!updated) {
      throw new AppError('Auto-apply submission not found', 404, 'APPLICATION_NOT_FOUND');
    }

    // If CAS lost the race, another request already transitioned — return idempotent success.
    const finalOpenedAt = updated.handoffOpenedAt ?? openedAt;
    const finalUrl = updated.externalConfirmationUrl ?? applyUrl;

    if (updated.handoffOpenedAt && updated.status === 'ACTION_REQUIRED') {
      // Only emit audit when this call performed the transition (openedAt matches our write)
      if (
        application.status !== 'ACTION_REQUIRED' &&
        Math.abs(finalOpenedAt.getTime() - openedAt.getTime()) < 2000
      ) {
        void autoApplyEventService.record({
          userId,
          jobApplicationId,
          eventType: 'HANDOFF_OPENED',
          metadata: { operationId: operationId ?? null },
        });
      }
    }

    logger.info(
      {
        jobApplicationId,
        operationId,
        viewState: toAssistedApplyViewState(updated.status),
        queuePublishInvoked: false,
      },
      'Assisted Apply direct handoff completed',
    );

    return {
      applyUrl: finalUrl,
      openedAt: finalOpenedAt.toISOString(),
      viewState: 'OPENED',
    };
  }

  private async resolveApplyUrl(jobId: string): Promise<string> {
    const job = await this.channelJobLookup.findJobChannelSnapshot(jobId);
    if (!job?.applyUrl) {
      throw new AppError('No validated external apply URL is available', 422, 'INVALID_APPLY_URL');
    }
    try {
      const parsed = new URL(job.applyUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('bad protocol');
      }
      // Basic SSRF guard: reject localhost / private hostnames
      const host = parsed.hostname.toLowerCase();
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '::1' ||
        host.endsWith('.local') ||
        host.startsWith('10.') ||
        host.startsWith('192.168.') ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
      ) {
        throw new AppError('Apply URL failed safe-URL validation', 422, 'INVALID_APPLY_URL');
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Apply URL failed safe-URL validation', 422, 'INVALID_APPLY_URL');
    }
    return job.applyUrl;
  }
}
