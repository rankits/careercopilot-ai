import { NextFunction, Request, Response } from 'express';
import { successResponse } from '@/shared/utils/response.js';
import { PrivacyAcknowledgementService } from '@/modules/auto-apply/services/privacy-acknowledgement.service.js';
import { requireUserPrincipalId } from '@/modules/auto-apply/utils/require-user.util.js';

const service = new PrivacyAcknowledgementService();

export const getPrivacyAcknowledgementController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const acknowledgement = await service.getAcknowledgement(userId);
    return res
      .status(200)
      .json(successResponse('Privacy acknowledgement fetched successfully', acknowledgement));
  } catch (error) {
    return next(error);
  }
};

export const savePrivacyAcknowledgementController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const acknowledgement = await service.acknowledge(userId, req.body);
    return res
      .status(201)
      .json(successResponse('Privacy policy acknowledged successfully', acknowledgement));
  } catch (error) {
    return next(error);
  }
};
