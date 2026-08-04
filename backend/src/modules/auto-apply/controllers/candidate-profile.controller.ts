import { NextFunction, Request, Response } from 'express';
import { successResponse } from '@/shared/utils/response.js';
import { CandidateApplicationProfileService } from '@/modules/auto-apply/services/candidate-profile.service.js';
import { PrismaCandidateApplicationProfileRepository } from '@/modules/auto-apply/repositories/prisma-candidate-profile.repository.js';
import { requireUserPrincipalId } from '@/modules/auto-apply/utils/require-user.util.js';

const repository = new PrismaCandidateApplicationProfileRepository();
export const candidateApplicationProfileService = new CandidateApplicationProfileService(
  repository,
);

export const getCandidateApplicationProfileController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const profile = await candidateApplicationProfileService.getProfile(userId);
    return res
      .status(200)
      .json(successResponse('Candidate application profile fetched successfully', profile));
  } catch (error) {
    return next(error);
  }
};

export const upsertCandidateApplicationProfileController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const profile = await candidateApplicationProfileService.upsertProfile(userId, req.body);
    return res
      .status(200)
      .json(successResponse('Candidate application profile saved successfully', profile));
  } catch (error) {
    return next(error);
  }
};
