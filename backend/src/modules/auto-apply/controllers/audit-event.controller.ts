import { NextFunction, Request, Response } from 'express';
import { successResponse } from '@/shared/utils/response.js';
import { AutoApplyEventService } from '@/modules/auto-apply/services/audit-event.service.js';
import { PrismaAutoApplyEventRepository } from '@/modules/auto-apply/repositories/prisma-audit-event.repository.js';
import { requireUserPrincipalId } from '@/modules/auto-apply/utils/require-user.util.js';

export const autoApplyEventService = new AutoApplyEventService(
  new PrismaAutoApplyEventRepository(),
);

export const listAutoApplyEventsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const jobApplicationId =
      typeof req.query.jobApplicationId === 'string' && req.query.jobApplicationId.trim()
        ? req.query.jobApplicationId.trim()
        : undefined;
    // Always scope by authenticated userId — jobApplicationId alone must never
    // return another user's events (empty list when the id belongs elsewhere).
    const events = await autoApplyEventService.listForUser(
      userId,
      undefined,
      jobApplicationId ? { jobApplicationId } : undefined,
    );
    return res.status(200).json(successResponse('Activity history fetched successfully', events));
  } catch (error) {
    return next(error);
  }
};
