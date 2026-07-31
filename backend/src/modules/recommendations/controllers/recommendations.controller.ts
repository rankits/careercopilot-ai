import type { Request, Response } from 'express';
import {
  toRecommendationResponse,
  toSimilarJobResponse,
} from '@/modules/recommendations/mappers/recommendation.mapper.js';
import type { RecommendationsService } from '@/modules/recommendations/services/recommendations.service.js';
import type { SimilarJobsService } from '@/modules/recommendations/services/similar-jobs.service.js';
import {
  createRecommendationFromTextSchema,
  createRecommendationSchema,
  similarJobParamsSchema,
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
    return res
      .status(200)
      .json(successResponse('Recommendations generated', result.map(toRecommendationResponse)));
  });

export const createRecommendationsFromTextController = (service: RecommendationsService) =>
  catchAsync(async (req: Request, res: Response) => {
    const input = createRecommendationFromTextSchema.shape.body.parse(req.body);
    const result = await service.createFromText(requireUserPrincipalId(req), input);
    return res
      .status(200)
      .json(successResponse('Recommendations generated', result.map(toRecommendationResponse)));
  });

export const createSimilarJobsController = (service: SimilarJobsService) =>
  catchAsync(async (req: Request, res: Response) => {
    const { params, query } = similarJobParamsSchema.parse({
      params: req.params,
      query: req.query,
    });
    const result = await service.findSimilar(
      requireUserPrincipalId(req),
      params.jobId,
      query.limit,
    );
    return res.status(200).json(
      successResponse(
        'Similar jobs retrieved',
        result.map((item, index) => toSimilarJobResponse(item, index + 1)),
      ),
    );
  });
