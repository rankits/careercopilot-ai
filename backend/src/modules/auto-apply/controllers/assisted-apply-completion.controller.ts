import { NextFunction, Request, Response } from 'express';
import { successResponse } from '@/shared/utils/response.js';
import { requireUserPrincipalId, getParam } from '@/modules/auto-apply/utils/require-user.util.js';
import { PrismaJobApplicationRepository } from '@/modules/auto-apply/repositories/prisma-job-application.repository.js';
import { AssistedApplyCompletionService } from '@/modules/auto-apply/services/assisted-apply-completion.service.js';

const completionService = new AssistedApplyCompletionService(new PrismaJobApplicationRepository());
export const assistedApplyCompletionService = completionService;

export const markAppliedController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const result = await completionService.markApplied(userId, id, {
      appliedAt: typeof req.body?.appliedAt === 'string' ? req.body.appliedAt : undefined,
      notes: typeof req.body?.notes === 'string' ? req.body.notes : undefined,
    });
    return res.status(200).json(successResponse('Marked as applied', result));
  } catch (error) {
    return next(error);
  }
};

export const abandonApplicationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const result = await completionService.abandon(userId, id, {
      reasonCode: String(req.body?.reasonCode ?? ''),
      note: typeof req.body?.note === 'string' ? req.body.note : undefined,
    });
    return res.status(200).json(successResponse('Application withdrawn', result));
  } catch (error) {
    return next(error);
  }
};

export const reportBrokenLinkController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const result = await completionService.reportBrokenLink(userId, id);
    return res.status(200).json(successResponse('Broken link reported', result));
  } catch (error) {
    return next(error);
  }
};
