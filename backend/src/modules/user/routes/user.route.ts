import express from 'express';
import {
  listUsersController,
  meController,
  updateMeController,
} from '@/modules/user/controllers/user.controller.js';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { userRateLimiter } from '@/shared/middlewares/rateLimiter.js';
import { requirePermission } from '@/shared/middlewares/rbac.middleware.js';
import { validateResource } from '@/shared/middlewares/validateResource.js';
import { USER_PERMISSIONS } from '@/shared/rbac/permission.catalog.js';
import {
  listUsersQuerySchema,
  updateProfileSchema,
} from '@/modules/user/validations/user.schema.js';

const router = express.Router();

router.get(
  '/me',
  authMiddleware,
  userRateLimiter,
  requirePermission(USER_PERMISSIONS.READ_PROFILE_OWN),
  meController,
);
router.patch(
  '/me',
  authMiddleware,
  userRateLimiter,
  requirePermission(USER_PERMISSIONS.UPDATE_PROFILE_OWN),
  validateResource(updateProfileSchema),
  updateMeController,
);

// Directory listing - gated on the specific `user.manage.any` attribute
// (an ".any"/admin-level key, so only a role the catalog grants it to -
// currently just ADMIN - passes), not on the role name directly.
router.get(
  '/',
  authMiddleware,
  userRateLimiter,
  requirePermission(USER_PERMISSIONS.MANAGE_ANY),
  validateResource(listUsersQuerySchema),
  listUsersController,
);

export default router;
