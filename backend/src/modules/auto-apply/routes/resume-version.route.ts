import express from 'express';
import { z } from 'zod';
import { validateResource } from '@/shared/middlewares/validateResource.js';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { requirePermission, requirePrincipalType } from '@/shared/middlewares/rbac.middleware.js';
import { AUTO_APPLY_PERMISSIONS } from '@/shared/rbac/permission.catalog.js';
import {
  listApprovedResumeVersionsController,
  createApprovedResumeVersionController,
  updateApprovedResumeVersionController,
  deleteApprovedResumeVersionController,
} from '@/modules/auto-apply/controllers/resume-version.controller.js';
import {
  CreateApprovedResumeVersionSchema,
  UpdateApprovedResumeVersionSchema,
} from '@/modules/auto-apply/validations/resume-version.validation.js';

const router = express.Router();

const requireUser = [authMiddleware, requirePrincipalType('USER')] as const;

router.get(
  '/',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.RESUME_VERSIONS_READ_OWN),
  listApprovedResumeVersionsController,
);

router.post(
  '/',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.RESUME_VERSIONS_CREATE_OWN),
  validateResource(z.object({ body: CreateApprovedResumeVersionSchema })),
  createApprovedResumeVersionController,
);

router.patch(
  '/:id',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.RESUME_VERSIONS_UPDATE_OWN),
  validateResource(z.object({ body: UpdateApprovedResumeVersionSchema })),
  updateApprovedResumeVersionController,
);

router.delete(
  '/:id',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.RESUME_VERSIONS_DELETE_OWN),
  deleteApprovedResumeVersionController,
);

export default router;
