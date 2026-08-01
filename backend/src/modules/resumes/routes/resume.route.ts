import express from 'express';
import {
  confirmProfileController,
  getCandidateProfileController,
  getMyCandidateProfileController,
  getParseStatusController,
  getParsedDataController,
  getResumeStatusController,
  resumeUploadMiddleware,
  reparseResumeController,
  startParseController,
  updateMyCandidateProfileController,
  uploadResumeController,
} from '@/modules/resumes/controllers/resume.controller.js';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { requirePermission } from '@/shared/middlewares/rbac.middleware.js';
import { validateResource } from '@/shared/middlewares/validateResource.js';
import { RESUME_PERMISSIONS } from '@/shared/rbac/permission.catalog.js';
import {
  candidateProfileParamsSchema,
  confirmProfileSchema,
  resumeIdParamsSchema,
  resumeParseActionParamsSchema,
  resumeReparseSchema,
  updateCandidateProfileSchema,
} from '@/modules/resumes/validations/resume.schema.js';

const router = express.Router();

router.post('/upload', resumeUploadMiddleware, uploadResumeController);
router.get(
  '/profile/me',
  authMiddleware,
  requirePermission(RESUME_PERMISSIONS.READ_OWN),
  getMyCandidateProfileController,
);
router.patch(
  '/profile/me',
  authMiddleware,
  requirePermission(RESUME_PERMISSIONS.UPDATE_OWN),
  validateResource(updateCandidateProfileSchema),
  updateMyCandidateProfileController,
);
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
