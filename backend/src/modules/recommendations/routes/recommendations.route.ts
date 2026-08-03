import express from 'express';
import type { CareerTargetService } from '@/modules/recommendations/services/career-target.service.js';
import type { RecommendationFeedbackService } from '@/modules/recommendations/services/recommendation-feedback.service.js';
import type { RecommendationsService } from '@/modules/recommendations/services/recommendations.service.js';
import type { SavedSearchService } from '@/modules/recommendations/services/saved-search.service.js';
import type { SimilarJobsService } from '@/modules/recommendations/services/similar-jobs.service.js';
import {
  archiveCareerTargetController,
  createCareerTargetController,
  createSavedSearchController,
  createRecommendationsController,
  createRecommendationsFromTextController,
  createSimilarJobsController,
  deleteSavedSearchController,
  generateSavedSearchController,
  getRecommendationController,
  getRecommendationReadinessController,
  getRecommendationRunController,
  getCareerTargetController,
  getSavedSearchController,
  listCareerTargetsController,
  listRecommendationsController,
  listSavedSearchesController,
  refreshRecommendationsController,
  updateSavedSearchController,
  upsertRecommendationFeedbackController,
} from '@/modules/recommendations/controllers/recommendations.controller.js';
import {
  archiveCareerTargetSchema,
  careerTargetDetailsSchema,
  createCareerTargetSchema,
  createRecommendationFromTextSchema,
  createRecommendationSchema,
  createSavedSearchSchema,
  deleteSavedSearchSchema,
  generateSavedSearchSchema,
  listCareerTargetsSchema,
  listRecommendationsSchema,
  listSavedSearchesSchema,
  recommendationFeedbackSchema,
  recommendationIdParamsSchema,
  recommendationReadinessSchema,
  recommendationRunDetailsSchema,
  refreshRecommendationSchema,
  savedSearchDetailsSchema,
  similarJobParamsSchema,
  updateSavedSearchSchema,
} from '@/modules/recommendations/validations/recommendation.schema.js';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { recommendationRateLimiter } from '@/shared/middlewares/rateLimiter.js';
import { requirePermission, requirePrincipalType } from '@/shared/middlewares/rbac.middleware.js';
import { validateResource } from '@/shared/middlewares/validateResource.js';
import { RECOMMENDATIONS_PERMISSIONS } from '@/shared/rbac/permission.catalog.js';

export const createRecommendationsRouter = (
  service: RecommendationsService,
  similarJobsService: SimilarJobsService,
  feedbackService: RecommendationFeedbackService,
  savedSearchService: SavedSearchService,
  careerTargetService: CareerTargetService,
) => {
  const router = express.Router();

  router.post(
    '/',
    authMiddleware,
    requirePrincipalType('USER'),
    requirePermission(RECOMMENDATIONS_PERMISSIONS.CREATE_OWN),
    recommendationRateLimiter,
    validateResource(createRecommendationSchema),
    createRecommendationsController(service),
  );

  router.post(
    '/from-text',
    authMiddleware,
    requirePrincipalType('USER'),
    requirePermission(RECOMMENDATIONS_PERMISSIONS.CREATE_OWN),
    recommendationRateLimiter,
    validateResource(createRecommendationFromTextSchema),
    createRecommendationsFromTextController(service),
  );

  router.post(
    '/refresh',
    authMiddleware,
    requirePrincipalType('USER'),
    requirePermission(RECOMMENDATIONS_PERMISSIONS.CREATE_OWN),
    recommendationRateLimiter,
    validateResource(refreshRecommendationSchema),
    refreshRecommendationsController(service),
  );

  router.get(
    '/status',
    authMiddleware,
    requirePrincipalType('USER'),
    requirePermission(RECOMMENDATIONS_PERMISSIONS.READ_OWN),
    validateResource(recommendationReadinessSchema),
    getRecommendationReadinessController(service),
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
    '/career-targets',
    authMiddleware,
    requirePrincipalType('USER'),
    requirePermission(RECOMMENDATIONS_PERMISSIONS.READ_OWN),
    validateResource(listCareerTargetsSchema),
    listCareerTargetsController(careerTargetService),
  );

  router.post(
    '/career-targets',
    authMiddleware,
    requirePrincipalType('USER'),
    requirePermission(RECOMMENDATIONS_PERMISSIONS.CREATE_OWN),
    validateResource(createCareerTargetSchema),
    createCareerTargetController(careerTargetService),
  );

  router.get(
    '/career-targets/:careerTargetId',
    authMiddleware,
    requirePrincipalType('USER'),
    requirePermission(RECOMMENDATIONS_PERMISSIONS.READ_OWN),
    validateResource(careerTargetDetailsSchema),
    getCareerTargetController(careerTargetService),
  );

  router.delete(
    '/career-targets/:careerTargetId',
    authMiddleware,
    requirePrincipalType('USER'),
    requirePermission(RECOMMENDATIONS_PERMISSIONS.UPDATE_OWN),
    validateResource(archiveCareerTargetSchema),
    archiveCareerTargetController(careerTargetService),
  );

  router.get(
    '/saved-searches',
    authMiddleware,
    requirePrincipalType('USER'),
    requirePermission(RECOMMENDATIONS_PERMISSIONS.READ_OWN),
    validateResource(listSavedSearchesSchema),
    listSavedSearchesController(savedSearchService),
  );

  router.post(
    '/saved-searches',
    authMiddleware,
    requirePrincipalType('USER'),
    requirePermission(RECOMMENDATIONS_PERMISSIONS.CREATE_OWN),
    validateResource(createSavedSearchSchema),
    createSavedSearchController(savedSearchService),
  );

  router.get(
    '/saved-searches/:savedSearchId',
    authMiddleware,
    requirePrincipalType('USER'),
    requirePermission(RECOMMENDATIONS_PERMISSIONS.READ_OWN),
    validateResource(savedSearchDetailsSchema),
    getSavedSearchController(savedSearchService),
  );

  router.patch(
    '/saved-searches/:savedSearchId',
    authMiddleware,
    requirePrincipalType('USER'),
    requirePermission(RECOMMENDATIONS_PERMISSIONS.UPDATE_OWN),
    validateResource(updateSavedSearchSchema),
    updateSavedSearchController(savedSearchService),
  );

  router.delete(
    '/saved-searches/:savedSearchId',
    authMiddleware,
    requirePrincipalType('USER'),
    requirePermission(RECOMMENDATIONS_PERMISSIONS.UPDATE_OWN),
    validateResource(deleteSavedSearchSchema),
    deleteSavedSearchController(savedSearchService),
  );

  router.post(
    '/saved-searches/:savedSearchId/generate',
    authMiddleware,
    requirePrincipalType('USER'),
    requirePermission(RECOMMENDATIONS_PERMISSIONS.CREATE_OWN),
    recommendationRateLimiter,
    validateResource(generateSavedSearchSchema),
    generateSavedSearchController(service),
  );

  router.get(
    '/runs/:runId',
    authMiddleware,
    requirePrincipalType('USER'),
    requirePermission(RECOMMENDATIONS_PERMISSIONS.READ_OWN),
    validateResource(recommendationRunDetailsSchema),
    getRecommendationRunController(service),
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
