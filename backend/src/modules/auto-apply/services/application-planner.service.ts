import { createHash } from 'node:crypto';
import { JobApplicationStatus } from '@prisma/client';
import { AppError } from '@/shared/utils/errors/AppError.js';
import {
  IJobApplicationRepository,
  IJobApplicationService,
} from '@/modules/auto-apply/contracts/job-application.contract.js';
import { IChannelDetectionService } from '@/modules/auto-apply/contracts/channel-detection.contract.js';
import { IApprovedResumeVersionRepository } from '@/modules/auto-apply/contracts/resume-version.contract.js';
import { IApplicationAnswerRepository } from '@/modules/auto-apply/contracts/application-answer.contract.js';
import { IApplicationPlannerService } from '@/modules/auto-apply/contracts/planner.contract.js';
import {
  ApplicationPlanDecision,
  ApplicationPlanResult,
} from '@/modules/auto-apply/types/planner.types.js';
import { JobApplicationDto } from '@/modules/auto-apply/types/job-application.types.js';
import { isValidTransition } from '@/modules/auto-apply/utils/state-machine.util.js';

/**
 * Implements AJA-PLAN-001. Orchestrates the shared services built in
 * Wave 2/3 (duplicate check, eligibility, channel detection, resume
 * selection, verified answers) into one idempotent `createPlan()` call —
 * without doing any AI content generation itself. Cover-letter and
 * screening-answer generation (AJA-AI-001, gated by AJA-AI-002's safety
 * checks) is a separate, not-yet-built capability; this planner reports
 * `contentGenerationAvailable: false` rather than fabricating content or
 * silently pretending the step ran.
 *
 * "Required questions" are checked against a small baseline catalog
 * (`BASELINE_REQUIRED_QUESTION_KEYS`), not job-specific extracted
 * questions — extracting real per-job screening questions needs AI-driven
 * job-description parsing that doesn't exist yet either. This is a
 * deliberately honest simplification, not a stand-in for the real thing.
 */
export class ApplicationPlannerService implements IApplicationPlannerService {
  private static readonly BASELINE_REQUIRED_QUESTION_KEYS = [
    'work_authorization',
    'notice_period_days',
  ];

  constructor(
    private readonly jobApplicationRepository: IJobApplicationRepository,
    private readonly jobApplicationService: IJobApplicationService,
    private readonly channelDetectionService: IChannelDetectionService,
    private readonly resumeVersionRepository: IApprovedResumeVersionRepository,
    private readonly answerRepository: IApplicationAnswerRepository,
  ) {}

  async createPlan(userId: string, jobId: string): Promise<ApplicationPlanResult> {
    let application = await this.jobApplicationRepository.findByUserIdAndJobId(userId, jobId);
    if (!application) {
      const result = await this.jobApplicationService.initiate(userId, jobId);
      application = result.application;
    }

    if (application.status === 'WITHDRAWN') {
      throw new AppError(
        'This submission was withdrawn — start a new one to plan again.',
        409,
        'APPLICATION_WITHDRAWN',
      );
    }

    if (
      application.status === 'DISCOVERED' ||
      application.status === 'MATCHED' ||
      application.status === 'NOT_ELIGIBLE'
    ) {
      application = await this.jobApplicationService.evaluateEligibility(userId, application.id);
    }

    if (application.status === 'NOT_ELIGIBLE') {
      return {
        application,
        decision: 'NOT_ELIGIBLE',
        channel: application.channel,
        eligibility: application.eligibilityResult!,
        selectedResumeVersion: null,
        unresolvedQuestions: [],
        contentGenerationAvailable: false,
      };
    }

    const channelResult = await this.channelDetectionService.detectChannel(jobId);

    const versions = await this.resumeVersionRepository.findManyByUserId(userId);
    const selectedResumeVersion = versions.find((version) => version.isActive) ?? null;

    const answers = await this.answerRepository.findManyByUserId(userId);
    const answeredKeys = new Set(answers.map((answer) => answer.questionKey));
    const unresolvedQuestions = ApplicationPlannerService.BASELINE_REQUIRED_QUESTION_KEYS.filter(
      (key) => !answeredKeys.has(key),
    );

    let decision: ApplicationPlanDecision;
    if (channelResult.channel === 'UNSUPPORTED') {
      decision = 'UNSUPPORTED_CHANNEL';
    } else if (!selectedResumeVersion || unresolvedQuestions.length > 0) {
      decision = 'INFORMATION_REQUIRED';
    } else {
      decision = 'READY_FOR_REVIEW';
    }

    application = await this.advanceToDecision(userId, application, decision);

    const inputsHash = ApplicationPlannerService.computeInputsHash({
      channel: channelResult.channel,
      resumeVersionId: selectedResumeVersion?.id ?? null,
      unresolvedQuestions,
      eligible: application.eligibilityResult?.eligible ?? null,
    });

    application = await this.jobApplicationRepository.updatePlan(userId, application.id, {
      channel: channelResult.channel,
      resumeVersionId: selectedResumeVersion?.id ?? null,
      planInputsHash: inputsHash,
    });

    return {
      application,
      decision,
      channel: channelResult.channel,
      eligibility: application.eligibilityResult!,
      selectedResumeVersion,
      unresolvedQuestions,
      contentGenerationAvailable: false,
    };
  }

  async getPlan(userId: string, jobId: string): Promise<ApplicationPlanResult | null> {
    const application = await this.jobApplicationRepository.findByUserIdAndJobId(userId, jobId);
    if (!application || application.status === 'DISCOVERED') {
      return null;
    }

    const decision = ApplicationPlannerService.statusToDecision(
      application.status as JobApplicationStatus,
    );
    if (!decision) return null;

    const selectedResumeVersion = application.resumeVersionId
      ? ((await this.resumeVersionRepository.findManyByUserId(userId)).find(
          (version) => version.id === application!.resumeVersionId,
        ) ?? null)
      : null;

    return {
      application,
      decision,
      channel: application.channel,
      eligibility: application.eligibilityResult ?? { eligible: false, checks: [] },
      selectedResumeVersion,
      unresolvedQuestions: [],
      contentGenerationAvailable: false,
    };
  }

  /** Walks the validated state machine forward from MATCHED toward the
   * computed decision. Never moves backward (e.g. READY_FOR_REVIEW back to
   * INFORMATION_REQUIRED) — that direction is an explicitly unsupported
   * regeneration case for this pass; withdrawing and re-initiating is the
   * supported path until a dedicated re-planning edge is added. */
  private async advanceToDecision(
    userId: string,
    application: JobApplicationDto,
    decision: ApplicationPlanDecision,
  ): Promise<JobApplicationDto> {
    let current = application;

    if (current.status === 'MATCHED') {
      current = await this.jobApplicationService.transitionStatus(
        userId,
        current.id,
        'APPLICATION_PLANNING',
      );
    }

    if (decision === 'UNSUPPORTED_CHANNEL') {
      return current;
    }

    const targetStatus: JobApplicationStatus =
      decision === 'INFORMATION_REQUIRED' ? 'INFORMATION_REQUIRED' : 'READY_FOR_REVIEW';

    if (current.status === targetStatus) {
      return current;
    }

    if (!isValidTransition(current.status as JobApplicationStatus, targetStatus)) {
      throw new AppError(
        `Plan regeneration would require moving backward from ${current.status} to ${targetStatus}; this is not yet supported. Withdraw and re-initiate this submission instead.`,
        409,
        'PLAN_REGRESSION_UNSUPPORTED',
      );
    }

    return this.jobApplicationService.transitionStatus(userId, current.id, targetStatus);
  }

  private static statusToDecision(status: JobApplicationStatus): ApplicationPlanDecision | null {
    switch (status) {
      case 'NOT_ELIGIBLE':
        return 'NOT_ELIGIBLE';
      case 'APPLICATION_PLANNING':
        return 'UNSUPPORTED_CHANNEL';
      case 'INFORMATION_REQUIRED':
        return 'INFORMATION_REQUIRED';
      case 'READY_FOR_REVIEW':
      case 'READY_FOR_AUTOPILOT':
      case 'APPROVED':
      case 'QUEUED':
      case 'SUBMITTING':
      case 'SUBMITTED':
      case 'CONFIRMATION_RECEIVED':
      case 'SUBMISSION_FAILED':
      case 'ACTION_REQUIRED':
        return 'READY_FOR_REVIEW';
      default:
        return null;
    }
  }

  private static computeInputsHash(parts: Record<string, unknown>): string {
    return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
  }
}
