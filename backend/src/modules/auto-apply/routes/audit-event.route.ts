import express from 'express';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { requirePermission, requirePrincipalType } from '@/shared/middlewares/rbac.middleware.js';
import { AUTO_APPLY_PERMISSIONS } from '@/shared/rbac/permission.catalog.js';
import { listAutoApplyEventsController } from '@/modules/auto-apply/controllers/audit-event.controller.js';

const router = express.Router();

router.get(
  '/',
  authMiddleware,
  requirePrincipalType('USER'),
  requirePermission(AUTO_APPLY_PERMISSIONS.EVENTS_READ_OWN),
  listAutoApplyEventsController,
);

export default router;
