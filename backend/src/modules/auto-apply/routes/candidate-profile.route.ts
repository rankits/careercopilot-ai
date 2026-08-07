import express from 'express';
import { z } from 'zod';
import { validateResource } from '@/shared/middlewares/validateResource.js';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { requirePermission, requirePrincipalType } from '@/shared/middlewares/rbac.middleware.js';
import { AUTO_APPLY_PERMISSIONS } from '@/shared/rbac/permission.catalog.js';
import {
  getCandidateApplicationProfileController,
  upsertCandidateApplicationProfileController,
} from '@/modules/auto-apply/controllers/candidate-profile.controller.js';
import { UpsertCandidateApplicationProfileSchema } from '@/modules/auto-apply/validations/candidate-profile.validation.js';

const router = express.Router();

const requireUser = [authMiddleware, requirePrincipalType('USER')] as const;

router.get(
  '/',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.PROFILE_READ_OWN),
  getCandidateApplicationProfileController,
);

router.put(
  '/',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.PROFILE_UPDATE_OWN),
  validateResource(z.object({ body: UpsertCandidateApplicationProfileSchema })),
  upsertCandidateApplicationProfileController,
);

export default router;
