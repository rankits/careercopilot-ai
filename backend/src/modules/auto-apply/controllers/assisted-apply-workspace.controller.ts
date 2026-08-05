import { NextFunction, Request, Response } from 'express';
import { successResponse } from '@/shared/utils/response.js';
import { requireUserPrincipalId, getParam } from '@/modules/auto-apply/utils/require-user.util.js';
import { PrismaJobApplicationRepository } from '@/modules/auto-apply/repositories/prisma-job-application.repository.js';
import { PrismaApplicationPageAnalysisRepository } from '@/modules/auto-apply/repositories/prisma-application-page-analysis.repository.js';
import { AssistedApplyWorkspaceService } from '@/modules/auto-apply/services/assisted-apply-workspace.service.js';

const workspaceService = new AssistedApplyWorkspaceService(
  new PrismaJobApplicationRepository(),
  new PrismaApplicationPageAnalysisRepository(),
);

export const getAssistedApplyWorkspaceController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const workspace = await workspaceService.getWorkspace(userId, id);
    return res.status(200).json(successResponse('Assisted Apply workspace', workspace));
  } catch (error) {
    return next(error);
  }
};

export const updateWorkspaceProgressStepController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const result = await workspaceService.updateProgressStep(userId, id, req.body.progressStep);
    return res.status(200).json(successResponse('Workspace progress step updated', result));
  } catch (error) {
    return next(error);
  }
};
