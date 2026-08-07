import express from 'express';
import { z } from 'zod';
import { validateResource } from '@/shared/middlewares/validateResource.js';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { requirePermission, requirePrincipalType } from '@/shared/middlewares/rbac.middleware.js';
import { AUTO_APPLY_PERMISSIONS } from '@/shared/rbac/permission.catalog.js';
import {
  getApplicationRuleController,
  upsertApplicationRuleController,
  pauseAutopilotController,
  resumeAutopilotController,
} from '@/modules/auto-apply/controllers/application-rule.controller.js';
import { UpsertApplicationRuleSchema } from '@/modules/auto-apply/validations/application-rule.validation.js';

const router = express.Router();

const requireUser = [authMiddleware, requirePrincipalType('USER')] as const;

router.get(
  '/',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.RULES_READ_OWN),
  getApplicationRuleController,
);

router.put(
  '/',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.RULES_UPDATE_OWN),
  validateResource(z.object({ body: UpsertApplicationRuleSchema })),
  upsertApplicationRuleController,
);

router.post(
  '/pause',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.RULES_UPDATE_OWN),
  pauseAutopilotController,
);

router.post(
  '/resume',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.RULES_UPDATE_OWN),
  resumeAutopilotController,
);

export default router;
