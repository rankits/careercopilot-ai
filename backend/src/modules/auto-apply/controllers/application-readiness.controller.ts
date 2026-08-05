import { NextFunction, Request, Response } from 'express';
import { successResponse } from '@/shared/utils/response.js';
import { applicationReadinessService } from '@/modules/auto-apply/wiring/readiness.wiring.js';
import { requireUserPrincipalId, getParam } from '@/modules/auto-apply/utils/require-user.util.js';
import { ApplicationReadinessStage } from '@/modules/auto-apply/types/application-readiness.types.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

const STAGES: ApplicationReadinessStage[] = ['PLAN', 'APPROVE', 'QUEUE', 'SUBMIT'];

export const evaluateReadinessController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const jobId = getParam(req.params.jobId, 'jobId');
    const stageRaw = String(req.query.stage ?? 'PLAN').toUpperCase();
    if (!STAGES.includes(stageRaw as ApplicationReadinessStage)) {
      throw new AppError(
        `Invalid stage. Expected one of: ${STAGES.join(', ')}`,
        400,
        'INVALID_READINESS_STAGE',
      );
    }
    const jobApplicationId =
      typeof req.query.jobApplicationId === 'string' ? req.query.jobApplicationId : undefined;

    const result = await applicationReadinessService.evaluate({
      userId,
      jobId,
      jobApplicationId,
      stage: stageRaw as ApplicationReadinessStage,
    });

    return res.status(200).json(successResponse('Application readiness evaluated', result));
  } catch (error) {
    return next(error);
  }
};
