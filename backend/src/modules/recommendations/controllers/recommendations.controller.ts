import type { Request, Response } from 'express';
import {
  toRecommendationPageResponse,
  toRecommendationFeedbackResponse,
  toRecommendationResponse,
  toRecommendationRunPageResponse,
  toSimilarJobResponse,
} from '@/modules/recommendations/mappers/recommendation.mapper.js';
import type { RecommendationFeedbackService } from '@/modules/recommendations/services/recommendation-feedback.service.js';
import type { RecommendationsService } from '@/modules/recommendations/services/recommendations.service.js';
import type { SavedSearchService } from '@/modules/recommendations/services/saved-search.service.js';
import type { SimilarJobsService } from '@/modules/recommendations/services/similar-jobs.service.js';
import {
  createRecommendationFromTextSchema,
  createRecommendationSchema,
  createSavedSearchSchema,
  deleteSavedSearchSchema,
  generateSavedSearchSchema,
  listRecommendationsSchema,
  listSavedSearchesSchema,
  recommendationFeedbackSchema,
  recommendationIdParamsSchema,
  recommendationRunDetailsSchema,
  refreshRecommendationSchema,
  savedSearchDetailsSchema,
  similarJobParamsSchema,
  updateSavedSearchSchema,
} from '@/modules/recommendations/validations/recommendation.schema.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { catchAsync } from '@/shared/utils/catchAsync.js';
import { successResponse } from '@/shared/utils/response.js';

const requireUserPrincipalId = (req: Request): string => {
  if (!req.user) throw new AppError('Authentication required', 401);
  if (req.user.principalType !== 'USER') {
    throw new AppError('Job recommendations are available only to user accounts', 403);
  }
  // Matches RecommendationRun.userId / JobRecommendation.userId (String(User.id)), not User.publicId.
  return String(req.user.principalId);
};

const toSavedSearchResponse = (savedSearch: {
  id: string;
  name: string;
  query: string | null;
  filters: unknown;
  context: unknown;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: savedSearch.id,
  name: savedSearch.name,
  query: savedSearch.query,
  filters: savedSearch.filters,
  context: savedSearch.context,
  createdAt: savedSearch.createdAt.toISOString(),
  updatedAt: savedSearch.updatedAt.toISOString(),
});

export const getRecommendationReadinessController = (service: RecommendationsService) =>
  catchAsync(async (req: Request, res: Response) => {
    const status = await service.getReadinessStatus(requireUserPrincipalId(req));
    return res.status(200).json(successResponse('Recommendation readiness retrieved', status));
  });

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

export const refreshRecommendationsController = (service: RecommendationsService) =>
  catchAsync(async (req: Request, res: Response) => {
    const input = refreshRecommendationSchema.shape.body.parse(req.body);
    const result = await service.refreshForSource(requireUserPrincipalId(req), input);
    return res
      .status(200)
      .json(successResponse('Recommendations refreshed', toRecommendationRunPageResponse(result)));
  });

export const listSavedSearchesController = (service: SavedSearchService) =>
  catchAsync(async (req: Request, res: Response) => {
    const { query } = listSavedSearchesSchema.parse({ query: req.query });
    const page = await service.list(requireUserPrincipalId(req), query);
    return res.status(200).json(
      successResponse('Saved searches retrieved', {
        items: page.items.map(toSavedSearchResponse),
        page: page.page,
        limit: page.limit,
        total: page.total,
      }),
    );
  });

export const createSavedSearchController = (service: SavedSearchService) =>
  catchAsync(async (req: Request, res: Response) => {
    const input = createSavedSearchSchema.shape.body.parse(req.body);
    const savedSearch = await service.create(requireUserPrincipalId(req), input);
    return res
      .status(201)
      .json(successResponse('Saved search created', toSavedSearchResponse(savedSearch)));
  });

export const getSavedSearchController = (service: SavedSearchService) =>
  catchAsync(async (req: Request, res: Response) => {
    const { params } = savedSearchDetailsSchema.parse({ params: req.params });
    const savedSearch = await service.get(requireUserPrincipalId(req), params.savedSearchId);
    return res
      .status(200)
      .json(successResponse('Saved search retrieved', toSavedSearchResponse(savedSearch)));
  });

export const updateSavedSearchController = (service: SavedSearchService) =>
  catchAsync(async (req: Request, res: Response) => {
    const { params, body } = updateSavedSearchSchema.parse({
      params: req.params,
      body: req.body,
    });
    const savedSearch = await service.update(
      requireUserPrincipalId(req),
      params.savedSearchId,
      body,
    );
    return res
      .status(200)
      .json(successResponse('Saved search updated', toSavedSearchResponse(savedSearch)));
  });

export const deleteSavedSearchController = (service: SavedSearchService) =>
  catchAsync(async (req: Request, res: Response) => {
    const { params } = deleteSavedSearchSchema.parse({ params: req.params });
    await service.delete(requireUserPrincipalId(req), params.savedSearchId);
    return res.status(200).json(successResponse('Saved search deleted'));
  });

export const generateSavedSearchController = (service: RecommendationsService) =>
  catchAsync(async (req: Request, res: Response) => {
    const { params, body } = generateSavedSearchSchema.parse({
      params: req.params,
      body: req.body,
    });
    const result = await service.createForSource(requireUserPrincipalId(req), {
      sourceType: 'SAVED_SEARCH',
      sourceId: params.savedSearchId,
      filters: body?.filters,
    });
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

export const listRecommendationsController = (service: RecommendationsService) =>
  catchAsync(async (req: Request, res: Response) => {
    const { query } = listRecommendationsSchema.parse({ query: req.query });
    const { runId, latestOnly, ...pagination } = query;
    const page = await service.listForUser(requireUserPrincipalId(req), pagination, {
      runId,
      latestOnly,
    });
    return res
      .status(200)
      .json(successResponse('Recommendations retrieved', toRecommendationPageResponse(page)));
  });

export const getRecommendationRunController = (service: RecommendationsService) =>
  catchAsync(async (req: Request, res: Response) => {
    const { params, query } = recommendationRunDetailsSchema.parse({
      params: req.params,
      query: req.query,
    });
    const page = await service.getRunDetailsForUser(
      requireUserPrincipalId(req),
      params.runId,
      query,
    );
    return res
      .status(200)
      .json(successResponse('Recommendation run retrieved', toRecommendationRunPageResponse(page)));
  });

export const getRecommendationController = (service: RecommendationsService) =>
  catchAsync(async (req: Request, res: Response) => {
    const { params } = recommendationIdParamsSchema.parse({ params: req.params });
    const record = await service.getForUser(requireUserPrincipalId(req), params.recommendationId);
    return res
      .status(200)
      .json(successResponse('Recommendation retrieved', toRecommendationResponse(record)));
  });

export const upsertRecommendationFeedbackController = (
  recommendationsService: RecommendationsService,
  feedbackService: RecommendationFeedbackService,
) =>
  catchAsync(async (req: Request, res: Response) => {
    const userId = requireUserPrincipalId(req);
    const { params, body } = recommendationFeedbackSchema.parse({
      params: req.params,
      body: req.body,
    });
    const recommendation = await recommendationsService.getForUser(userId, params.recommendationId);
    const feedback = await feedbackService.store({
      userId,
      recommendationId: recommendation.id,
      jobId: recommendation.job.id,
      action: body.action,
      note: body.note,
    });
    return res
      .status(200)
      .json(
        successResponse(
          'Recommendation feedback saved',
          toRecommendationFeedbackResponse(feedback),
        ),
      );
  });
