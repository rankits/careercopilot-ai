import express from 'express';
import {
  applySuggestionController,
  deleteSavedVersionController,
  exportResumeController,
  getAnalysisController,
  getKeywordsController,
  getSavedVersionController,
  getSuggestionsController,
  getVersionsController,
  ignoreSuggestionController,
  listSavedVersionsController,
  recheckAtsController,
  saveVersionController,
  startAnalysisController,
  updateContentController,
  updateStepController,
} from '@/modules/resume-analysis/controllers/resume-analysis.controller.js';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { resumeAnalysisRateLimiter } from '@/shared/middlewares/rateLimiter.js';
import { requirePermission, requirePrincipalType } from '@/shared/middlewares/rbac.middleware.js';
import { validateResource } from '@/shared/middlewares/validateResource.js';
import { RESUME_PERMISSIONS } from '@/shared/rbac/permission.catalog.js';
import {
  analyzeResumeSchema,
  exportResumeQuerySchema,
  resumeAnalysisIdParamsSchema,
  saveResumeVersionSchema,
  savedVersionIdParamsSchema,
  suggestionActionSchema,
  updateAnalysisContentSchema,
  updateAnalysisStepSchema,
} from '@/modules/resume-analysis/validations/resume-analysis.schema.js';

const router = express.Router();

const requireUser = [authMiddleware, requirePrincipalType('USER')] as const;
const canRead = requirePermission(RESUME_PERMISSIONS.READ_ANALYSIS_OWN);
const canWrite = requirePermission(RESUME_PERMISSIONS.UPDATE_OWN);

// Static paths first (before /:resumeId)
router.get('/saved-versions', ...requireUser, canRead, listSavedVersionsController);
router.get(
  '/saved-versions/:versionId',
  ...requireUser,
  canRead,
  validateResource(savedVersionIdParamsSchema),
  getSavedVersionController,
);
router.delete(
  '/saved-versions/:versionId',
  ...requireUser,
  canWrite,
  validateResource(savedVersionIdParamsSchema),
  deleteSavedVersionController,
);

router.post(
  '/:resumeId/analyze',
  ...requireUser,
  canWrite,
  resumeAnalysisRateLimiter,
  validateResource(analyzeResumeSchema),
  startAnalysisController,
);
router.get(
  '/:resumeId/analysis',
  ...requireUser,
  canRead,
  validateResource(resumeAnalysisIdParamsSchema),
  getAnalysisController,
);
router.patch(
  '/:resumeId/step',
  ...requireUser,
  canWrite,
  validateResource(updateAnalysisStepSchema),
  updateStepController,
);
router.get(
  '/:resumeId/keywords',
  ...requireUser,
  canRead,
  validateResource(resumeAnalysisIdParamsSchema),
  getKeywordsController,
);
router.get(
  '/:resumeId/suggestions',
  ...requireUser,
  canRead,
  validateResource(resumeAnalysisIdParamsSchema),
  getSuggestionsController,
);
router.post(
  '/:resumeId/suggestions/:suggestionId/apply',
  ...requireUser,
  canWrite,
  validateResource(suggestionActionSchema),
  applySuggestionController,
);
router.post(
  '/:resumeId/suggestions/:suggestionId/ignore',
  ...requireUser,
  canWrite,
  validateResource(suggestionActionSchema),
  ignoreSuggestionController,
);
router.patch(
  '/:resumeId/content',
  ...requireUser,
  canWrite,
  validateResource(updateAnalysisContentSchema),
  updateContentController,
);
router.post(
  '/:resumeId/recheck',
  ...requireUser,
  canWrite,
  resumeAnalysisRateLimiter,
  validateResource(resumeAnalysisIdParamsSchema),
  recheckAtsController,
);
router.post(
  '/:resumeId/versions',
  ...requireUser,
  canWrite,
  validateResource(saveResumeVersionSchema),
  saveVersionController,
);
router.get(
  '/:resumeId/versions',
  ...requireUser,
  canRead,
  validateResource(resumeAnalysisIdParamsSchema),
  getVersionsController,
);
router.get(
  '/:resumeId/export',
  ...requireUser,
  canRead,
  validateResource(exportResumeQuerySchema),
  exportResumeController,
);

export default router;
