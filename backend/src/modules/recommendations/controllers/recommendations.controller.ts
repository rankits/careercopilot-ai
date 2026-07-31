import type { Request, Response } from 'express';
import type { RecommendationsService } from '@/modules/recommendations/services/recommendations.service.js';
import {
  createRecommendationFromTextSchema,
  createRecommendationSchema,
} from '@/modules/recommendations/validations/recommendation.schema.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { catchAsync } from '@/shared/utils/catchAsync.js';
import { successResponse } from '@/shared/utils/response.js';

const requireUserPrincipalId = (req: Request): string => {
  if (!req.user) throw new AppError('Authentication required', 401);
  if (req.user.principalType !== 'USER') {
    throw new AppError('Job recommendations are available only to user accounts', 403);
  }
  return req.user.principalId;
};

export const createRecommendationsController = (service: RecommendationsService) =>
  catchAsync(async (req: Request, res: Response) => {
    const input = createRecommendationSchema.shape.body.parse(req.body);
    const result = await service.createForSource(requireUserPrincipalId(req), input);
    return res.status(202).json(successResponse('Recommendation generation started', result));
  });

export const createRecommendationsFromTextController = (service: RecommendationsService) =>
  catchAsync(async (req: Request, res: Response) => {
    const input = createRecommendationFromTextSchema.shape.body.parse(req.body);
    const result = await service.createFromText(requireUserPrincipalId(req), input);
    return res.status(202).json(successResponse('Recommendation generation started', result));
  });
