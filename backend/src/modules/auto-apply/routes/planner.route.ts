import express from 'express';
import { z } from 'zod';
import { validateResource } from '@/shared/middlewares/validateResource.js';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { requirePermission, requirePrincipalType } from '@/shared/middlewares/rbac.middleware.js';
import { AUTO_APPLY_PERMISSIONS } from '@/shared/rbac/permission.catalog.js';
import {
  createPlanController,
  getPlanController,
} from '@/modules/auto-apply/controllers/planner.controller.js';
import { operationIdMiddleware } from '@/modules/auto-apply/middlewares/operation-id.middleware.js';

const router = express.Router();

const requireUser = [authMiddleware, requirePrincipalType('USER')] as const;

router.post(
  '/',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.PLAN_CREATE_OWN),
  operationIdMiddleware,
  validateResource(
    z.object({ body: z.object({ jobId: z.string().uuid('Invalid job ID format') }) }),
  ),
  createPlanController,
);

router.get(
  '/:jobId',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.PLAN_READ_OWN),
  validateResource(
    z.object({ params: z.object({ jobId: z.string().uuid('Invalid job ID format') }) }),
  ),
  getPlanController,
);

export default router;
