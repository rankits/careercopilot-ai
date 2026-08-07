import express from 'express';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { requirePermission } from '@/shared/middlewares/rbac.middleware.js';
import { AUTO_APPLY_PERMISSIONS } from '@/shared/rbac/permission.catalog.js';
import { getAssistedApplyRolloutFlagsController } from '@/modules/auto-apply/controllers/assisted-apply-rollout.controller.js';

const router = express.Router();
const requireUser = [authMiddleware];

router.get(
  '/',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.SUBMISSIONS_READ_OWN),
  getAssistedApplyRolloutFlagsController,
);

export default router;
