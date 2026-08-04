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
import { validateResource } from '@/shared/middlewares/validateResource.js';
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

// Static paths first (before /:resumeId)
router.get('/saved-versions', listSavedVersionsController);
router.get(
  '/saved-versions/:versionId',
  validateResource(savedVersionIdParamsSchema),
  getSavedVersionController,
);
router.delete(
  '/saved-versions/:versionId',
  validateResource(savedVersionIdParamsSchema),
  deleteSavedVersionController,
);

router.post('/:resumeId/analyze', validateResource(analyzeResumeSchema), startAnalysisController);
router.get(
  '/:resumeId/analysis',
  validateResource(resumeAnalysisIdParamsSchema),
  getAnalysisController,
);
router.patch('/:resumeId/step', validateResource(updateAnalysisStepSchema), updateStepController);
router.get(
  '/:resumeId/keywords',
  validateResource(resumeAnalysisIdParamsSchema),
  getKeywordsController,
);
router.get(
  '/:resumeId/suggestions',
  validateResource(resumeAnalysisIdParamsSchema),
  getSuggestionsController,
);
router.post(
  '/:resumeId/suggestions/:suggestionId/apply',
  validateResource(suggestionActionSchema),
  applySuggestionController,
);
router.post(
  '/:resumeId/suggestions/:suggestionId/ignore',
  validateResource(suggestionActionSchema),
  ignoreSuggestionController,
);
router.patch(
  '/:resumeId/content',
  validateResource(updateAnalysisContentSchema),
  updateContentController,
);
router.post(
  '/:resumeId/recheck',
  validateResource(resumeAnalysisIdParamsSchema),
  recheckAtsController,
);
router.post(
  '/:resumeId/versions',
  validateResource(saveResumeVersionSchema),
  saveVersionController,
);
router.get(
  '/:resumeId/versions',
  validateResource(resumeAnalysisIdParamsSchema),
  getVersionsController,
);
router.get('/:resumeId/export', validateResource(exportResumeQuerySchema), exportResumeController);

export default router;
