import { NextFunction, Request, Response } from 'express';
import { successResponse } from '@/shared/utils/response.js';
import { AdminDiagnosticsService } from '@/modules/auto-apply/services/admin-diagnostics.service.js';
import { PrismaAdminDiagnosticsRepository } from '@/modules/auto-apply/repositories/prisma-admin-diagnostics.repository.js';

export const adminDiagnosticsService = new AdminDiagnosticsService(
  new PrismaAdminDiagnosticsRepository(),
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
