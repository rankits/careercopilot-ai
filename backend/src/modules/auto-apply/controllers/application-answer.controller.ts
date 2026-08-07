import { NextFunction, Request, Response } from 'express';
import { successResponse } from '@/shared/utils/response.js';
import { ApplicationAnswerService } from '@/modules/auto-apply/services/application-answer.service.js';
import { PrismaApplicationAnswerRepository } from '@/modules/auto-apply/repositories/prisma-application-answer.repository.js';
import { requireUserPrincipalId, getParam } from '@/modules/auto-apply/utils/require-user.util.js';

const repository = new PrismaApplicationAnswerRepository();
export const applicationAnswerService = new ApplicationAnswerService(repository);

export const listApplicationAnswersController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const answers = await applicationAnswerService.listAnswers(userId);
    return res.status(200).json(successResponse('Verified answers fetched successfully', answers));
  } catch (error) {
    return next(error);
  }
};

export const createApplicationAnswerController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const answer = await applicationAnswerService.createAnswer(userId, req.body);
    return res.status(201).json(successResponse('Verified answer saved successfully', answer));
  } catch (error) {
    return next(error);
  }
};

export const updateApplicationAnswerController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    const answer = await applicationAnswerService.updateAnswer(userId, id, req.body);
    return res.status(200).json(successResponse('Verified answer updated successfully', answer));
  } catch (error) {
    return next(error);
  }
};

export const deleteApplicationAnswerController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const id = getParam(req.params.id, 'id');
    await applicationAnswerService.deleteAnswer(userId, id);
    return res.status(200).json(successResponse('Verified answer deleted successfully'));
  } catch (error) {
    return next(error);
  }
};
