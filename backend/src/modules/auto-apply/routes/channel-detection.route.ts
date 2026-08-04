import express from 'express';
import { z } from 'zod';
import { validateResource } from '@/shared/middlewares/validateResource.js';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { requirePermission, requirePrincipalType } from '@/shared/middlewares/rbac.middleware.js';
import { AUTO_APPLY_PERMISSIONS } from '@/shared/rbac/permission.catalog.js';
import { detectChannelController } from '@/modules/auto-apply/controllers/channel-detection.controller.js';

const router = express.Router();

const requireUser = [authMiddleware, requirePrincipalType('USER')] as const;

router.get(
  '/:jobId',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.CHANNEL_READ_OWN),
  validateResource(
    z.object({ params: z.object({ jobId: z.string().uuid('Invalid job ID format') }) }),
  ),
  detectChannelController,
);

export default router;
