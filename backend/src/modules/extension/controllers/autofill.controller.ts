import { NextFunction, Request, Response } from 'express';
import { successResponse } from '@/shared/utils/response.js';
import { requireUserPrincipalId } from '@/modules/auto-apply/utils/require-user.util.js';
import { autofillService } from '@/modules/extension/services/autofill.service.js';

export const generateAutofillAnswersController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const { url, fields } = req.body;

    const answers = await autofillService.generateAnswers(userId, url, fields);
    
    return res.status(200).json(successResponse('Answers generated successfully', { answers }));
  } catch (error) {
    return next(error);
  }
};
