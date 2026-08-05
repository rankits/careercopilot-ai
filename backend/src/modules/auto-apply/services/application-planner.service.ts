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
import { IApplicationReadinessService } from '@/modules/auto-apply/contracts/application-readiness.contract.js';
import {
  ApplicationPlanDecision,
  ApplicationPlanResult,
} from '@/modules/auto-apply/types/planner.types.js';
import { JobApplicationDto } from '@/modules/auto-apply/types/job-application.types.js';
import { isValidTransition } from '@/modules/auto-apply/utils/state-machine.util.js';
import { readinessToPlannerDecision } from '@/modules/auto-apply/services/application-readiness.service.js';
import { ApplicationContentPreparationService } from '@/modules/auto-apply/services/application-content-preparation.service.js';
import { PreparedScreeningAnswer } from '@/modules/auto-apply/types/application-content.types.js';

/**
 * AJA-PLAN-001 — orchestrates duplicate check, eligibility, readiness, and
 * optional grounded content preparation (AJA-AI-001) into one idempotent
 * `createPlan()` call. Content generation failures never hard-block the plan.
 */
export class ApplicationPlannerService implements IApplicationPlannerService {
  constructor(
    private readonly jobApplicationRepository: IJobApplicationRepository,
    private readonly jobApplicationService: IJobApplicationService,
    private readonly channelDetectionService: IChannelDetectionService,
    private readonly resumeVersionRepository: IApprovedResumeVersionRepository,
    private readonly answerRepository: IApplicationAnswerRepository,
    private readonly readinessService: IApplicationReadinessService,
    private readonly contentPreparation?: ApplicationContentPreparationService,
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
      return this.emptyContentResult({
        application,
        decision: 'NOT_ELIGIBLE',
        channel: application.channel,
        eligibility: application.eligibilityResult!,
        selectedResumeVersion: null,
        unresolvedQuestions: [],
        readiness: undefined,
      });
    }

    const readiness = await this.readinessService.evaluate({
      userId,
      jobId,
      jobApplicationId: application.id,
      stage: 'PLAN',
    });

    if (readiness.decision === 'FEATURE_DISABLED') {
      throw new AppError(
        'Auto Apply is disabled or paused — planning is unavailable.',
        403,
        'READINESS_FEATURE_DISABLED',
        readiness,
      );
    }

    const channelResult = await this.channelDetectionService.detectChannel(jobId);
    const versions = await this.resumeVersionRepository.findManyByUserId(userId);
    const selectedResumeVersion = versions.find((version) => version.isActive) ?? null;

    const unresolvedQuestions = readiness.blockingReasons
      .filter((reason) => reason.severity === 'BLOCKING' && reason.field)
      .map((reason) => reason.field!)
      .filter((field, index, all) => all.indexOf(field) === index);

    let decision: ApplicationPlanDecision = readinessToPlannerDecision(readiness.decision);
    if (readiness.ready) {
      decision = 'READY_FOR_REVIEW';
    } else if (channelResult.channel === 'UNSUPPORTED') {
      decision = 'UNSUPPORTED_CHANNEL';
    }

    if (readiness.decision === 'NOT_ELIGIBLE') {
      decision = 'NOT_ELIGIBLE';
      if (application.status !== 'NOT_ELIGIBLE') {
        application = await this.jobApplicationService.transitionStatus(
          userId,
          application.id,
          'NOT_ELIGIBLE',
        );
      }
      return this.emptyContentResult({
        application,
        decision,
        channel: channelResult.channel,
        eligibility: application.eligibilityResult ?? { eligible: false, checks: [] },
        selectedResumeVersion,
        unresolvedQuestions,
        readiness,
      });
    }

    application = await this.advanceToDecision(userId, application, decision);

    const content = await this.prepareContent({
      userId,
      jobId,
      application,
      resumeId: selectedResumeVersion?.resumeId ?? null,
    });

    const inputsHash = ApplicationPlannerService.computeInputsHash({
      channel: channelResult.channel,
      resumeVersionId: selectedResumeVersion?.id ?? null,
      unresolvedQuestions,
      eligible: application.eligibilityResult?.eligible ?? null,
      readinessDecision: readiness.decision,
      readinessCodes: readiness.blockingReasons.map((r) => r.code),
      coverLetterHash: content.coverLetter
        ? createHash('sha256').update(content.coverLetter).digest('hex').slice(0, 16)
        : null,
    });

    application = await this.jobApplicationRepository.updatePlan(userId, application.id, {
      channel: channelResult.channel,
      resumeVersionId: selectedResumeVersion?.id ?? null,
      planInputsHash: inputsHash,
      coverLetterContent: content.coverLetter,
    });

    return {
      application,
      decision,
      channel: channelResult.channel,
      eligibility: application.eligibilityResult!,
      selectedResumeVersion,
      unresolvedQuestions,
      contentGenerationAvailable: content.contentGenerationAvailable,
      coverLetter: content.coverLetter,
      screeningAnswers: content.screeningAnswers,
      contentWarnings: content.warnings,
      readiness,
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

    const content = await this.prepareContent({
      userId,
      jobId,
      application,
      resumeId: selectedResumeVersion?.resumeId ?? null,
      preferStoredCoverLetter: true,
    });

    return {
      application,
      decision,
      channel: application.channel,
      eligibility: application.eligibilityResult ?? { eligible: false, checks: [] },
      selectedResumeVersion,
      unresolvedQuestions: [],
      contentGenerationAvailable: content.contentGenerationAvailable,
      coverLetter: content.coverLetter,
      screeningAnswers: content.screeningAnswers,
      contentWarnings: content.warnings,
    };
  }

  private async prepareContent(args: {
    userId: string;
    jobId: string;
    application: JobApplicationDto;
    resumeId: string | null;
    preferStoredCoverLetter?: boolean;
  }): Promise<{
    coverLetter: string | null;
    screeningAnswers: PreparedScreeningAnswer[];
    contentGenerationAvailable: boolean;
    warnings: string[];
  }> {
    if (!this.contentPreparation) {
      return {
        coverLetter: args.preferStoredCoverLetter
          ? (args.application.coverLetterContent ?? null)
          : null,
        screeningAnswers: [],
        contentGenerationAvailable: Boolean(args.application.coverLetterContent),
        warnings: [],
      };
    }

    try {
      const prepared = await this.contentPreparation.prepare({
        userId: args.userId,
        jobId: args.jobId,
        jobTitle: args.application.jobTitle,
        companySlug: args.application.companySlug,
        resumeId: args.resumeId,
      });

      if (args.preferStoredCoverLetter && args.application.coverLetterContent?.trim()) {
        return {
          ...prepared,
          coverLetter: args.application.coverLetterContent,
          contentGenerationAvailable: true,
        };
      }

      return prepared;
    } catch {
      return {
        coverLetter: args.application.coverLetterContent ?? null,
        screeningAnswers: [],
        contentGenerationAvailable: Boolean(args.application.coverLetterContent),
        warnings: ['Content preparation failed — plan continues without generated materials.'],
      };
    }
  }

  private emptyContentResult(
    partial: Omit<
      ApplicationPlanResult,
      'contentGenerationAvailable' | 'coverLetter' | 'screeningAnswers' | 'contentWarnings'
    >,
  ): ApplicationPlanResult {
    return {
      ...partial,
      contentGenerationAvailable: false,
      coverLetter: null,
      screeningAnswers: [],
      contentWarnings: [],
    };
  }

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

    if (decision === 'NOT_ELIGIBLE') {
      if (current.status === 'NOT_ELIGIBLE') return current;
      if (isValidTransition(current.status as JobApplicationStatus, 'NOT_ELIGIBLE')) {
        return this.jobApplicationService.transitionStatus(userId, current.id, 'NOT_ELIGIBLE');
      }
      return current;
    }

    const targetStatus: JobApplicationStatus =
      decision === 'INFORMATION_REQUIRED' ? 'INFORMATION_REQUIRED' : 'READY_FOR_REVIEW';

    if (current.status === targetStatus) {
      return current;
    }

    if (
      decision === 'READY_FOR_REVIEW' &&
      ApplicationPlannerService.isPastReadyForReview(current.status as JobApplicationStatus)
    ) {
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

  private static isPastReadyForReview(status: JobApplicationStatus): boolean {
    return (
      status === 'READY_FOR_AUTOPILOT' ||
      status === 'APPROVED' ||
      status === 'QUEUED' ||
      status === 'SUBMITTING' ||
      status === 'SUBMITTED' ||
      status === 'CONFIRMATION_RECEIVED' ||
      status === 'SUBMISSION_FAILED' ||
      status === 'ACTION_REQUIRED'
    );
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
