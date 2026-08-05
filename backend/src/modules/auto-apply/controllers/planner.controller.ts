import { NextFunction, Request, Response } from 'express';
import { successResponse, errorResponse } from '@/shared/utils/response.js';
import { ApplicationPlannerService } from '@/modules/auto-apply/services/application-planner.service.js';
import { PrismaJobApplicationRepository } from '@/modules/auto-apply/repositories/prisma-job-application.repository.js';
import { PrismaApprovedResumeVersionRepository } from '@/modules/auto-apply/repositories/prisma-resume-version.repository.js';
import { PrismaApplicationAnswerRepository } from '@/modules/auto-apply/repositories/prisma-application-answer.repository.js';
import { PrismaApplicationConsentRepository } from '@/modules/auto-apply/repositories/prisma-application-consent.repository.js';
import { PrismaJobDescriptionLookup } from '@/modules/auto-apply/repositories/prisma-job-description.lookup.js';
import { PrismaUserContactLookup } from '@/modules/auto-apply/repositories/prisma-readiness-lookups.repository.js';
import { ApplicationContentPreparationService } from '@/modules/auto-apply/services/application-content-preparation.service.js';
import { jobApplicationService } from '@/modules/auto-apply/controllers/job-application.controller.js';
import { channelDetectionService } from '@/modules/auto-apply/controllers/channel-detection.controller.js';
import { autoApplyEventService } from '@/modules/auto-apply/controllers/audit-event.controller.js';
import { applicationReadinessService } from '@/modules/auto-apply/wiring/readiness.wiring.js';
import { PrismaApplicationPageAnalysisRepository } from '@/modules/auto-apply/repositories/prisma-application-page-analysis.repository.js';
import { requireUserPrincipalId, getParam } from '@/modules/auto-apply/utils/require-user.util.js';
import {
  getOperationId,
  getOperationLogger,
} from '@/modules/auto-apply/middlewares/operation-id.middleware.js';

const answerRepository = new PrismaApplicationAnswerRepository();
const consentRepository = new PrismaApplicationConsentRepository();

const contentPreparation = ApplicationContentPreparationService.createDefault(
  answerRepository,
  consentRepository,
  new PrismaJobDescriptionLookup(),
  new PrismaUserContactLookup(),
);

export const applicationPlannerService = new ApplicationPlannerService(
  new PrismaJobApplicationRepository(),
  jobApplicationService,
  channelDetectionService,
  new PrismaApprovedResumeVersionRepository(),
  answerRepository,
  applicationReadinessService,
  contentPreparation,
  new PrismaApplicationPageAnalysisRepository(),
);

export const createPlanController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserPrincipalId(req);
    const operationId = getOperationId() ?? req.operationId;
    getOperationLogger().info(
      { operationId, userId, jobId: req.body.jobId },
      'Application plan requested',
    );
    const plan = await applicationPlannerService.createPlan(userId, req.body.jobId);
    getOperationLogger().info(
      {
        operationId,
        userId,
        jobId: req.body.jobId,
        jobApplicationId: plan.application.id,
        decision: plan.decision,
      },
      'Application plan generated',
    );
    void autoApplyEventService.record({
      userId,
      eventType: 'PLAN_CREATED',
      jobApplicationId: plan.application.id,
      metadata: {
        decision: plan.decision,
        channel: plan.channel,
        readinessDecision: plan.readiness?.decision,
        blockingCodes: plan.readiness?.blockingReasons.map((r) => r.code) ?? [],
        ...(operationId ? { operationId } : {}),
      },
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
