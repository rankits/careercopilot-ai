import express from 'express';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { requirePermission, requirePrincipalType } from '@/shared/middlewares/rbac.middleware.js';
import { AUTO_APPLY_PERMISSIONS } from '@/shared/rbac/permission.catalog.js';
import { evaluateReadinessController } from '@/modules/auto-apply/controllers/application-readiness.controller.js';

const router = express.Router();

const requireUser = [authMiddleware, requirePrincipalType('USER')] as const;

router.get(
  '/:jobId',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.ELIGIBILITY_READ_OWN),
  evaluateReadinessController,
);

export default router;
