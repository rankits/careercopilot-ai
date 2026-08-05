import express from 'express';
import { z } from 'zod';
import { validateResource } from '@/shared/middlewares/validateResource.js';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { requirePermission, requirePrincipalType } from '@/shared/middlewares/rbac.middleware.js';
import { AUTO_APPLY_PERMISSIONS } from '@/shared/rbac/permission.catalog.js';
import {
  getStuckSubmissionsController,
  reclaimStuckSubmissionsController,
} from '@/modules/auto-apply/controllers/admin-diagnostics.controller.js';

const router = express.Router();

router.get(
  '/stuck-submissions',
  authMiddleware,
  requirePrincipalType('ADMIN'),
  requirePermission(AUTO_APPLY_PERMISSIONS.DIAGNOSTICS_READ_ANY),
  validateResource(
    z.object({
      query: z.object({
        queueStalledAfterMinutes: z.coerce.number().int().min(1).optional(),
        awaitingConfirmationAfterDays: z.coerce.number().int().min(1).optional(),
      }),
    }),
  ),
  getStuckSubmissionsController,
);

router.post(
  '/reclaim-stuck',
  authMiddleware,
  requirePrincipalType('ADMIN'),
  requirePermission(AUTO_APPLY_PERMISSIONS.DIAGNOSTICS_WRITE_ANY),
  validateResource(
    z.object({
      body: z.object({
        submittingOlderThanMinutes: z.coerce.number().int().min(1).optional(),
      }),
    }),
  ),
  reclaimStuckSubmissionsController,
);

export default router;
