import { NextFunction, Request, Response } from 'express';
import { successResponse } from '@/shared/utils/response.js';
import { ApplicationRuleService } from '@/modules/auto-apply/services/application-rule.service.js';
import { PrismaApplicationRuleRepository } from '@/modules/auto-apply/repositories/prisma-application-rule.repository.js';
import { requireUserPrincipalId } from '@/modules/auto-apply/utils/require-user.util.js';

const repository = new PrismaApplicationRuleRepository();
export const applicationRuleService = new ApplicationRuleService(repository);

export const getApplicationRuleController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const rule = await applicationRuleService.getRule(userId);
    return res
      .status(200)
      .json(successResponse('Application rule configuration fetched successfully', rule));
  } catch (error) {
    return next(error);
  }
};

export const upsertApplicationRuleController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const rule = await applicationRuleService.upsertRule(userId, req.body);
    return res
      .status(200)
      .json(successResponse('Application rule configuration saved successfully', rule));
  } catch (error) {
    return next(error);
  }
};

export const pauseAutopilotController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserPrincipalId(req);
    const rule = await applicationRuleService.pauseAutopilot(userId);
    return res.status(200).json(successResponse('Autopilot paused', rule));
  } catch (error) {
    return next(error);
  }
};

export const resumeAutopilotController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const rule = await applicationRuleService.resumeAutopilot(userId);
    return res.status(200).json(successResponse('Autopilot resumed', rule));
  } catch (error) {
    return next(error);
  }
};
