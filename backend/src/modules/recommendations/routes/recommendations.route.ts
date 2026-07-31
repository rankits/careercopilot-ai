import express from 'express';
import type { RecommendationFeedbackService } from '@/modules/recommendations/services/recommendation-feedback.service.js';
import type { RecommendationsService } from '@/modules/recommendations/services/recommendations.service.js';
import type { SimilarJobsService } from '@/modules/recommendations/services/similar-jobs.service.js';
import {
  createRecommendationsController,
  createRecommendationsFromTextController,
  createSimilarJobsController,
  getRecommendationController,
  listRecommendationsController,
  upsertRecommendationFeedbackController,
} from '@/modules/recommendations/controllers/recommendations.controller.js';
import {
  createRecommendationFromTextSchema,
  createRecommendationSchema,
  listRecommendationsSchema,
  recommendationFeedbackSchema,
  recommendationIdParamsSchema,
  similarJobParamsSchema,
} from '@/modules/recommendations/validations/recommendation.schema.js';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { requirePermission, requirePrincipalType } from '@/shared/middlewares/rbac.middleware.js';
import { validateResource } from '@/shared/middlewares/validateResource.js';
import { RECOMMENDATIONS_PERMISSIONS } from '@/shared/rbac/permission.catalog.js';

export const createRecommendationsRouter = (
  service: RecommendationsService,
  similarJobsService: SimilarJobsService,
  feedbackService: RecommendationFeedbackService,
) => {
  const router = express.Router();

  router.post(
    '/',
    authMiddleware,
    requirePrincipalType('USER'),
    requirePermission(RECOMMENDATIONS_PERMISSIONS.CREATE_OWN),
    validateResource(createRecommendationSchema),
    createRecommendationsController(service),
  );

  router.post(
    '/from-text',
    authMiddleware,
    requirePrincipalType('USER'),
    requirePermission(RECOMMENDATIONS_PERMISSIONS.CREATE_OWN),
    validateResource(createRecommendationFromTextSchema),
    createRecommendationsFromTextController(service),
  );

  router.get(
    '/',
    authMiddleware,
    requirePrincipalType('USER'),
    requirePermission(RECOMMENDATIONS_PERMISSIONS.READ_OWN),
    validateResource(listRecommendationsSchema),
    listRecommendationsController(service),
  );

  router.get(
    '/similar/:jobId',
    authMiddleware,
    requirePrincipalType('USER'),
    requirePermission(RECOMMENDATIONS_PERMISSIONS.READ_OWN),
    validateResource(similarJobParamsSchema),
    createSimilarJobsController(similarJobsService),
  );

  router.get(
    '/:recommendationId',
    authMiddleware,
    requirePrincipalType('USER'),
    requirePermission(RECOMMENDATIONS_PERMISSIONS.READ_OWN),
    validateResource(recommendationIdParamsSchema),
    getRecommendationController(service),
  );

  router.post(
    '/:recommendationId/feedback',
    authMiddleware,
    requirePrincipalType('USER'),
    requirePermission(RECOMMENDATIONS_PERMISSIONS.UPDATE_OWN),
    validateResource(recommendationFeedbackSchema),
    upsertRecommendationFeedbackController(service, feedbackService),
  );

  return router;
};
