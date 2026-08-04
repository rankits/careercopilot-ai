import { NextFunction, Request, Response } from 'express';
import { successResponse } from '@/shared/utils/response.js';
import { JobApplicationService } from '@/modules/auto-apply/services/job-application.service.js';
import { PrismaJobApplicationRepository } from '@/modules/auto-apply/repositories/prisma-job-application.repository.js';
import { PrismaJobEligibilityLookup } from '@/modules/auto-apply/repositories/prisma-job-eligibility.lookup.js';
import { eligibilityService } from '@/modules/auto-apply/controllers/eligibility.controller.js';
import { requireUserPrincipalId, getParam } from '@/modules/auto-apply/utils/require-user.util.js';

const repository = new PrismaJobApplicationRepository();
export const jobApplicationService = new JobApplicationService(
  repository,
  eligibilityService,
  new PrismaJobEligibilityLookup(),
);

export const listJobApplicationsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const applications = await jobApplicationService.listApplications(userId);
    return res
      .status(200)
      .json(successResponse('Auto-apply submissions fetched successfully', applications));
  } catch (error) {
    return next(error);
  }
};

export const getJobApplicationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const application = await jobApplicationService.getApplication(userId, id);
    return res
      .status(200)
      .json(successResponse('Auto-apply submission fetched successfully', application));
  } catch (error) {
    return next(error);
  }
};

export const initiateJobApplicationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const result = await jobApplicationService.initiate(userId, req.body.jobId);
    const message =
      result.possibleDuplicates.length > 0
        ? 'Auto-apply submission created successfully (possible duplicate detected — review before proceeding)'
        : 'Auto-apply submission created successfully';
    return res.status(201).json(successResponse(message, result));
  } catch (error) {
    return next(error);
  }
};

export const evaluateJobApplicationEligibilityController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const application = await jobApplicationService.evaluateEligibility(userId, id);
    return res.status(200).json(successResponse('Eligibility evaluated successfully', application));
  } catch (error) {
    return next(error);
  }
};

export const transitionJobApplicationStatusController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const application = await jobApplicationService.transitionStatus(userId, id, req.body.toStatus);
    return res
      .status(200)
      .json(successResponse('Submission status transitioned successfully', application));
  } catch (error) {
    return next(error);
  }
};

export const withdrawJobApplicationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const application = await jobApplicationService.withdraw(userId, id);
    return res.status(200).json(successResponse('Auto-apply submission withdrawn', application));
  } catch (error) {
    return next(error);
  }
};
