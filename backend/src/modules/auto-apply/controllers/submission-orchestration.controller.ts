import { NextFunction, Request, Response } from 'express';
import { successResponse } from '@/shared/utils/response.js';
import { SubmissionOrchestrationService } from '@/modules/auto-apply/services/submission-orchestration.service.js';
import { PrismaSubmissionAttemptRepository } from '@/modules/auto-apply/repositories/prisma-submission-attempt.repository.js';
import { PrismaJobApplicationRepository } from '@/modules/auto-apply/repositories/prisma-job-application.repository.js';
import { PrismaApplicationRuleRepository } from '@/modules/auto-apply/repositories/prisma-application-rule.repository.js';
import { RabbitMqSubmissionQueuePort } from '@/modules/auto-apply/adapters/rabbitmq-submission-queue.port.js';
import { jobApplicationService } from '@/modules/auto-apply/controllers/job-application.controller.js';
import { autoApplyEventService } from '@/modules/auto-apply/controllers/audit-event.controller.js';
import { applicationReadinessService } from '@/modules/auto-apply/wiring/readiness.wiring.js';
import { requireUserPrincipalId, getParam } from '@/modules/auto-apply/utils/require-user.util.js';

export const submissionOrchestrationService = new SubmissionOrchestrationService(
  jobApplicationService,
  new PrismaJobApplicationRepository(),
  new PrismaSubmissionAttemptRepository(),
  new RabbitMqSubmissionQueuePort(),
  applicationReadinessService,
  new PrismaApplicationRuleRepository(),
);

export const approveSubmissionController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const application = await submissionOrchestrationService.approve(userId, id);
    void autoApplyEventService.record({
      userId,
      eventType: 'SUBMISSION_APPROVED',
      jobApplicationId: id,
    });
    return res.status(200).json(successResponse('Submission approved', application));
  } catch (error) {
    return next(error);
  }
};

export const queueSubmissionController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const application = await submissionOrchestrationService.queueForSubmission(userId, id);
    void autoApplyEventService.record({
      userId,
      eventType: 'SUBMISSION_QUEUED',
      jobApplicationId: id,
    });
    return res.status(200).json(successResponse('Submission queued', application));
  } catch (error) {
    return next(error);
  }
};

export const confirmSubmissionController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const application = await submissionOrchestrationService.confirmCompleted(userId, id);
    void autoApplyEventService.record({
      userId,
      eventType: 'SUBMISSION_CONFIRMED',
      jobApplicationId: id,
    });
    return res.status(200).json(successResponse('Submission confirmed complete', application));
  } catch (error) {
    return next(error);
  }
};

export const retrySubmissionController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const application = await submissionOrchestrationService.retry(userId, id);
    return res.status(200).json(successResponse('Submission re-queued for retry', application));
  } catch (error) {
    return next(error);
  }
};
