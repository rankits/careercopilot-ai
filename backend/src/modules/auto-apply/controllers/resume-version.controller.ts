import { NextFunction, Request, Response } from 'express';
import { successResponse } from '@/shared/utils/response.js';
import { ApprovedResumeVersionService } from '@/modules/auto-apply/services/resume-version.service.js';
import {
  PrismaApprovedResumeVersionRepository,
  PrismaResumeOwnershipLookup,
} from '@/modules/auto-apply/repositories/prisma-resume-version.repository.js';
import { requireUserPrincipalId, getParam } from '@/modules/auto-apply/utils/require-user.util.js';

const repository = new PrismaApprovedResumeVersionRepository();
const resumeOwnership = new PrismaResumeOwnershipLookup();
export const approvedResumeVersionService = new ApprovedResumeVersionService(
  repository,
  resumeOwnership,
);

export const listApprovedResumeVersionsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const versions = await approvedResumeVersionService.listVersions(userId);
    return res
      .status(200)
      .json(successResponse('Approved resume versions fetched successfully', versions));
  } catch (error) {
    return next(error);
  }
};

export const createApprovedResumeVersionController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const version = await approvedResumeVersionService.createVersion(userId, req.body);
    return res
      .status(201)
      .json(successResponse('Approved resume version created successfully', version));
  } catch (error) {
    return next(error);
  }
};

export const updateApprovedResumeVersionController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const version = await approvedResumeVersionService.updateVersion(userId, id, req.body);
    return res
      .status(200)
      .json(successResponse('Approved resume version updated successfully', version));
  } catch (error) {
    return next(error);
  }
};

export const deleteApprovedResumeVersionController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const result = await approvedResumeVersionService.deleteVersion(userId, id);
    return res.status(200).json(
      successResponse('Approved resume version deleted successfully', {
        newDefaultResumeVersionId: result.newDefaultResumeVersionId,
        newDefaultLabel: result.newDefaultLabel,
      }),
    );
  } catch (error) {
    return next(error);
  }
};
