import express from 'express';
import {
  confirmProfileController,
  deleteResumeController,
  downloadResumeController,
  getCandidateProfileController,
  getMyCandidateProfileController,
  getParseStatusController,
  getParsedDataController,
  getResumeStatusController,
  listResumesController,
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

router.post(
  '/upload',
  authMiddleware,
  requirePermission(RESUME_PERMISSIONS.CREATE_OWN),
  resumeUploadMiddleware,
  uploadResumeController,
);
router.get(
  '/',
  authMiddleware,
  requirePermission(RESUME_PERMISSIONS.READ_OWN),
  listResumesController,
);
router.delete(
  '/:resumeId',
  authMiddleware,
  requirePermission(RESUME_PERMISSIONS.DELETE_OWN),
  validateResource(resumeIdParamsSchema),
  deleteResumeController,
);
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
  authMiddleware,
  requirePermission(RESUME_PERMISSIONS.READ_OWN),
  validateResource(candidateProfileParamsSchema),
  getCandidateProfileController,
);
router.get(
  '/:resumeId/status',
  authMiddleware,
  requirePermission(RESUME_PERMISSIONS.READ_OWN),
  validateResource(resumeIdParamsSchema),
  getResumeStatusController,
);
router.get(
  '/:resumeId/download',
  authMiddleware,
  requirePermission(RESUME_PERMISSIONS.READ_OWN),
  validateResource(resumeIdParamsSchema),
  downloadResumeController,
);
router.get(
  '/:resumeId/parsed-data',
  authMiddleware,
  requirePermission(RESUME_PERMISSIONS.READ_OWN),
  validateResource(resumeIdParamsSchema),
  getParsedDataController,
);
router.get(
  '/:resumeId/parsed',
  authMiddleware,
  requirePermission(RESUME_PERMISSIONS.READ_OWN),
  validateResource(resumeIdParamsSchema),
  getParsedDataController,
);
router.get(
  '/:resumeId/parse-status',
  authMiddleware,
  requirePermission(RESUME_PERMISSIONS.READ_OWN),
  validateResource(resumeParseActionParamsSchema),
  getParseStatusController,
);
router.post(
  '/:resumeId/parse',
  authMiddleware,
  requirePermission(RESUME_PERMISSIONS.UPDATE_OWN),
  validateResource(resumeParseActionParamsSchema),
  startParseController,
);
router.post(
  '/:resumeId/reparse',
  authMiddleware,
  requirePermission(RESUME_PERMISSIONS.UPDATE_OWN),
  validateResource(resumeReparseSchema),
  reparseResumeController,
);
router.post(
  '/profile/:userId',
  authMiddleware,
  requirePermission(RESUME_PERMISSIONS.CREATE_OWN),
  validateResource(confirmProfileSchema),
  confirmProfileController,
);

export default router;
