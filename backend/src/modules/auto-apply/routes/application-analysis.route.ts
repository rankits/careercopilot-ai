import express from 'express';
import { z } from 'zod';
import { validateResource } from '@/shared/middlewares/validateResource.js';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { requirePermission, requirePrincipalType } from '@/shared/middlewares/rbac.middleware.js';
import { AUTO_APPLY_PERMISSIONS } from '@/shared/rbac/permission.catalog.js';
import {
  createJobAnalysisController,
  getLatestJobAnalysisController,
  prepareApplicationController,
} from '@/modules/auto-apply/controllers/application-analysis.controller.js';
import { operationIdMiddleware } from '@/modules/auto-apply/middlewares/operation-id.middleware.js';

const router = express.Router({ mergeParams: true });
const requireUser = [authMiddleware, requirePrincipalType('USER')] as const;

const PrepareBodySchema = z.object({
  body: z
    .object({
      applyMode: z.enum(['PREPARE', 'ASSISTED', 'AUTOPILOT', 'EXTENSION']).default('PREPARE'),
      jobApplicationId: z.string().uuid().optional(),
      resumeVersionId: z.string().uuid().optional(),
      allowMatchCompute: z.boolean().optional(),
      forceRefreshAnalysis: z.boolean().optional(),
    })
    .default({ applyMode: 'PREPARE' }),
});

const AnalyzeBodySchema = z.object({
  body: z
    .object({
      forceRefresh: z.boolean().optional(),
    })
    .default({}),
});

router.post(
  '/analysis',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.PLAN_CREATE_OWN),
  operationIdMiddleware,
  validateResource(AnalyzeBodySchema),
  createJobAnalysisController,
);

router.get(
  '/analysis/latest',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.PLAN_READ_OWN),
  getLatestJobAnalysisController,
);

router.post(
  '/prepare',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.PLAN_CREATE_OWN),
  operationIdMiddleware,
  validateResource(PrepareBodySchema),
  prepareApplicationController,
);

export default router;
