import express from 'express';
import type { RecommendationsService } from '@/modules/recommendations/services/recommendations.service.js';
import type { SimilarJobsService } from '@/modules/recommendations/services/similar-jobs.service.js';
import {
  createRecommendationsController,
  createRecommendationsFromTextController,
  createSimilarJobsController,
} from '@/modules/recommendations/controllers/recommendations.controller.js';
import {
  createRecommendationFromTextSchema,
  createRecommendationSchema,
  similarJobParamsSchema,
} from '@/modules/recommendations/validations/recommendation.schema.js';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { requirePermission, requirePrincipalType } from '@/shared/middlewares/rbac.middleware.js';
import { validateResource } from '@/shared/middlewares/validateResource.js';
import { RECOMMENDATIONS_PERMISSIONS } from '@/shared/rbac/permission.catalog.js';

export const createRecommendationsRouter = (
  service: RecommendationsService,
  similarJobsService: SimilarJobsService,
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
    '/similar/:jobId',
    authMiddleware,
    requirePrincipalType('USER'),
    requirePermission(RECOMMENDATIONS_PERMISSIONS.READ_OWN),
    validateResource(similarJobParamsSchema),
    createSimilarJobsController(similarJobsService),
  );

  // List/detail/feedback schemas stay unmounted until durable Prisma recommendation models land.
  return router;
};
