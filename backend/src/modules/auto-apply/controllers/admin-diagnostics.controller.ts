import { NextFunction, Request, Response } from 'express';
import { successResponse } from '@/shared/utils/response.js';
import { AdminDiagnosticsService } from '@/modules/auto-apply/services/admin-diagnostics.service.js';
import { PrismaAdminDiagnosticsRepository } from '@/modules/auto-apply/repositories/prisma-admin-diagnostics.repository.js';
import { PrismaSubmissionAttemptRepository } from '@/modules/auto-apply/repositories/prisma-submission-attempt.repository.js';
import { autoApplyEventService } from '@/modules/auto-apply/controllers/audit-event.controller.js';

export const adminDiagnosticsService = new AdminDiagnosticsService(
  new PrismaAdminDiagnosticsRepository(),
  new PrismaSubmissionAttemptRepository(),
  autoApplyEventService,
);

export const getStuckSubmissionsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const queueStalledAfterMinutes = req.query.queueStalledAfterMinutes
      ? Number(req.query.queueStalledAfterMinutes)
      : undefined;
    const awaitingConfirmationAfterDays = req.query.awaitingConfirmationAfterDays
      ? Number(req.query.awaitingConfirmationAfterDays)
      : undefined;

    const stuck = await adminDiagnosticsService.getStuckSubmissions({
      queueStalledAfterMinutes,
      awaitingConfirmationAfterDays,
    });
    return res.status(200).json(successResponse('Stuck submissions fetched successfully', stuck));
  } catch (error) {
    return next(error);
  }
};

export const reclaimStuckSubmissionsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const submittingOlderThanMinutes =
      req.body?.submittingOlderThanMinutes !== undefined
        ? Number(req.body.submittingOlderThanMinutes)
        : undefined;

    const result = await adminDiagnosticsService.reclaimStuckSubmissions({
      submittingOlderThanMinutes,
    });
    return res
      .status(200)
      .json(successResponse('Stuck submissions reclaimed successfully', result));
  } catch (error) {
    return next(error);
  }
};
