import { NextFunction, Request, Response } from 'express';
import { successResponse, errorResponse } from '@/shared/utils/response.js';
import { ApplicationPlannerService } from '@/modules/auto-apply/services/application-planner.service.js';
import { PrismaJobApplicationRepository } from '@/modules/auto-apply/repositories/prisma-job-application.repository.js';
import { PrismaApprovedResumeVersionRepository } from '@/modules/auto-apply/repositories/prisma-resume-version.repository.js';
import { PrismaApplicationAnswerRepository } from '@/modules/auto-apply/repositories/prisma-application-answer.repository.js';
import { jobApplicationService } from '@/modules/auto-apply/controllers/job-application.controller.js';
import { channelDetectionService } from '@/modules/auto-apply/controllers/channel-detection.controller.js';
import { autoApplyEventService } from '@/modules/auto-apply/controllers/audit-event.controller.js';
import { requireUserPrincipalId, getParam } from '@/modules/auto-apply/utils/require-user.util.js';

export const applicationPlannerService = new ApplicationPlannerService(
  new PrismaJobApplicationRepository(),
  jobApplicationService,
  channelDetectionService,
  new PrismaApprovedResumeVersionRepository(),
  new PrismaApplicationAnswerRepository(),
);

export const createPlanController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserPrincipalId(req);
    const plan = await applicationPlannerService.createPlan(userId, req.body.jobId);
    void autoApplyEventService.record({
      userId,
      eventType: 'PLAN_CREATED',
      jobApplicationId: plan.application.id,
      metadata: { decision: plan.decision, channel: plan.channel },
    });
    return res.status(200).json(successResponse('Application plan generated successfully', plan));
  } catch (error) {
    return next(error);
  }
};

export const getPlanController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserPrincipalId(req);
    const jobId = getParam(req.params.jobId, 'jobId');
    const plan = await applicationPlannerService.getPlan(userId, jobId);
    if (!plan) {
      return res
        .status(404)
        .json(
          errorResponse('No plan exists yet for this job', undefined, { code: 'PLAN_NOT_FOUND' }),
        );
    }
    return res.status(200).json(successResponse('Application plan fetched successfully', plan));
  } catch (error) {
    return next(error);
  }
};
