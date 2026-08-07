import { NextFunction, Request, Response } from 'express';
import { successResponse } from '@/shared/utils/response.js';
import { EligibilityService } from '@/modules/auto-apply/services/eligibility.service.js';
import { PrismaCandidateApplicationProfileRepository } from '@/modules/auto-apply/repositories/prisma-candidate-profile.repository.js';
import { PrismaApplicationRuleRepository } from '@/modules/auto-apply/repositories/prisma-application-rule.repository.js';
import { PrismaJobEligibilityLookup } from '@/modules/auto-apply/repositories/prisma-job-eligibility.lookup.js';
import { requireUserPrincipalId, getParam } from '@/modules/auto-apply/utils/require-user.util.js';

export const eligibilityService = new EligibilityService(
  new PrismaCandidateApplicationProfileRepository(),
  new PrismaApplicationRuleRepository(),
  new PrismaJobEligibilityLookup(),
);

export const checkEligibilityController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const jobId = getParam(req.params.jobId, 'jobId');
    const result = await eligibilityService.evaluateForJob(userId, jobId);
    return res.status(200).json(successResponse('Eligibility check completed', result));
  } catch (error) {
    return next(error);
  }
};
