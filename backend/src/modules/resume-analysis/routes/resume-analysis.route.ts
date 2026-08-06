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
import { requirePermission } from '@/shared/middlewares/rbac.middleware.js';
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

const requireAuth = authMiddleware;
const canReadAnalysis = requirePermission(RESUME_PERMISSIONS.READ_ANALYSIS_OWN);
const canUpdateAnalysis = requirePermission(RESUME_PERMISSIONS.UPDATE_ANALYSIS_OWN);
const canDeleteAnalysis = requirePermission(RESUME_PERMISSIONS.DELETE_ANALYSIS_OWN);

// Static paths first (before /:resumeId)
router.get('/saved-versions', requireAuth, canReadAnalysis, listSavedVersionsController);
router.get(
  '/saved-versions/:versionId',
  requireAuth,
  canReadAnalysis,
  validateResource(savedVersionIdParamsSchema),
  getSavedVersionController,
);
router.delete(
  '/saved-versions/:versionId',
  requireAuth,
  canDeleteAnalysis,
  validateResource(savedVersionIdParamsSchema),
  deleteSavedVersionController,
);

router.post(
  '/:resumeId/analyze',
  requireAuth,
  canUpdateAnalysis,
  validateResource(analyzeResumeSchema),
  startAnalysisController,
);
router.get(
  '/:resumeId/analysis',
  requireAuth,
  canReadAnalysis,
  validateResource(resumeAnalysisIdParamsSchema),
  getAnalysisController,
);
router.patch(
  '/:resumeId/step',
  requireAuth,
  canUpdateAnalysis,
  validateResource(updateAnalysisStepSchema),
  updateStepController,
);
router.get(
  '/:resumeId/keywords',
  requireAuth,
  canReadAnalysis,
  validateResource(resumeAnalysisIdParamsSchema),
  getKeywordsController,
);
router.get(
  '/:resumeId/suggestions',
  requireAuth,
  canReadAnalysis,
  validateResource(resumeAnalysisIdParamsSchema),
  getSuggestionsController,
);
router.post(
  '/:resumeId/suggestions/:suggestionId/apply',
  requireAuth,
  canUpdateAnalysis,
  validateResource(suggestionActionSchema),
  applySuggestionController,
);
router.post(
  '/:resumeId/suggestions/:suggestionId/ignore',
  requireAuth,
  canUpdateAnalysis,
  validateResource(suggestionActionSchema),
  ignoreSuggestionController,
);
router.patch(
  '/:resumeId/content',
  requireAuth,
  canUpdateAnalysis,
  validateResource(updateAnalysisContentSchema),
  updateContentController,
);
router.post(
  '/:resumeId/recheck',
  requireAuth,
  canUpdateAnalysis,
  validateResource(resumeAnalysisIdParamsSchema),
  recheckAtsController,
);
router.post(
  '/:resumeId/versions',
  requireAuth,
  canUpdateAnalysis,
  validateResource(saveResumeVersionSchema),
  saveVersionController,
);
router.get(
  '/:resumeId/versions',
  requireAuth,
  canReadAnalysis,
  validateResource(resumeAnalysisIdParamsSchema),
  getVersionsController,
);
router.get(
  '/:resumeId/export',
  requireAuth,
  canReadAnalysis,
  validateResource(exportResumeQuerySchema),
  exportResumeController,
);

export default router;
