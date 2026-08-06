import express from 'express';

import { chatController } from '@/modules/copilot/controllers/copilot.controller.js';
import { copilotChatSchema } from '@/modules/copilot/validations/copilot.schema.js';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { copilotRateLimiter } from '@/shared/middlewares/rateLimiter.js';
import { requirePermission, requirePrincipalType } from '@/shared/middlewares/rbac.middleware.js';
import { validateResource } from '@/shared/middlewares/validateResource.js';
import { CAREER_PERMISSIONS } from '@/shared/rbac/permission.catalog.js';

const router = express.Router();

router.post(
  '/chat',
  authMiddleware,
  requirePrincipalType('USER'),
  requirePermission(CAREER_PERMISSIONS.READ_OWN),
  copilotRateLimiter,
  validateResource(copilotChatSchema),
  chatController,
);

export default router;
