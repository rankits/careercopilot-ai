import express from 'express';
import {
  confirmProfileController,
  getCandidateProfileController,
  getParseStatusController,
  getParsedDataController,
  getResumeStatusController,
  resumeUploadMiddleware,
  reparseResumeController,
  startParseController,
  uploadResumeController,
} from '@/modules/resumes/controllers/resume.controller.js';
import { validateResource } from '@/shared/middlewares/validateResource.js';
import {
  candidateProfileParamsSchema,
  confirmProfileSchema,
  resumeIdParamsSchema,
  resumeParseActionParamsSchema,
  resumeReparseSchema,
} from '@/modules/resumes/validations/resume.schema.js';

const router = express.Router();

router.post('/upload', resumeUploadMiddleware, uploadResumeController);
router.get(
  '/profiles/:userId',
  validateResource(candidateProfileParamsSchema),
  getCandidateProfileController,
);
router.get('/:resumeId/status', validateResource(resumeIdParamsSchema), getResumeStatusController);
router.get(
  '/:resumeId/parsed-data',
  validateResource(resumeIdParamsSchema),
  getParsedDataController,
);
router.get('/:resumeId/parsed', validateResource(resumeIdParamsSchema), getParsedDataController);
router.get(
  '/:resumeId/parse-status',
  validateResource(resumeParseActionParamsSchema),
  getParseStatusController,
);
router.post(
  '/:resumeId/parse',
  validateResource(resumeParseActionParamsSchema),
  startParseController,
);
router.post('/:resumeId/reparse', validateResource(resumeReparseSchema), reparseResumeController);
router.post('/profile/:userId', validateResource(confirmProfileSchema), confirmProfileController);

export default router;
