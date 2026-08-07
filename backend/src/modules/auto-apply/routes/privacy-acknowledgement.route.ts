import express from 'express';
import { z } from 'zod';
import { validateResource } from '@/shared/middlewares/validateResource.js';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { requirePermission, requirePrincipalType } from '@/shared/middlewares/rbac.middleware.js';
import { AUTO_APPLY_PERMISSIONS } from '@/shared/rbac/permission.catalog.js';
import {
  getPrivacyAcknowledgementController,
  savePrivacyAcknowledgementController,
} from '@/modules/auto-apply/controllers/privacy-acknowledgement.controller.js';
import { PrivacyAcknowledgementSchema } from '@/modules/auto-apply/validations/privacy-acknowledgement.validation.js';

const router = express.Router();

const requireUser = [authMiddleware, requirePrincipalType('USER')] as const;

router.get(
  '/',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.PROFILE_READ_OWN),
  getPrivacyAcknowledgementController,
);

router.post(
  '/',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.PROFILE_UPDATE_OWN),
  validateResource(z.object({ body: PrivacyAcknowledgementSchema })),
  savePrivacyAcknowledgementController,
);

export default router;
