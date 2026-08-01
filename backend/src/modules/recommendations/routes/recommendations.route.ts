import express from 'express';
import type { RecommendationsService } from '@/modules/recommendations/services/recommendations.service.js';
import {
  createRecommendationsController,
  createRecommendationsFromTextController,
} from '@/modules/recommendations/controllers/recommendations.controller.js';
import {
  createRecommendationFromTextSchema,
  createRecommendationSchema,
} from '@/modules/recommendations/validations/recommendation.schema.js';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { requirePermission, requirePrincipalType } from '@/shared/middlewares/rbac.middleware.js';
import { validateResource } from '@/shared/middlewares/validateResource.js';
import { RECOMMENDATIONS_PERMISSIONS } from '@/shared/rbac/permission.catalog.js';

export const createRecommendationsRouter = (service: RecommendationsService) => {
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

  // List/detail/feedback/similar-job schemas and contracts are exported but deliberately not
  // mounted until recommendation Prisma models and retrieval-provider ownership are decided.
  return router;
};
