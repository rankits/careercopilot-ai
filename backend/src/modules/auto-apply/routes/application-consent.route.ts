import express from 'express';
import { z } from 'zod';
import { validateResource } from '@/shared/middlewares/validateResource.js';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { requirePermission, requirePrincipalType } from '@/shared/middlewares/rbac.middleware.js';
import { AUTO_APPLY_PERMISSIONS } from '@/shared/rbac/permission.catalog.js';
import {
  listApplicationConsentsController,
  grantApplicationConsentController,
  revokeApplicationConsentController,
} from '@/modules/auto-apply/controllers/application-consent.controller.js';
import { GrantApplicationConsentSchema } from '@/modules/auto-apply/validations/application-consent.validation.js';

const router = express.Router();

const requireUser = [authMiddleware, requirePrincipalType('USER')] as const;

router.get(
  '/',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.CONSENT_READ_OWN),
  listApplicationConsentsController,
);

router.post(
  '/',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.CONSENT_CREATE_OWN),
  validateResource(z.object({ body: GrantApplicationConsentSchema })),
  grantApplicationConsentController,
);

router.delete(
  '/:id',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.CONSENT_DELETE_OWN),
  revokeApplicationConsentController,
);

export default router;
