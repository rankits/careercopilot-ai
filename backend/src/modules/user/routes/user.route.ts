import express from 'express';
import {
  listUsersController,
  meController,
  updateMeController,
} from '@/modules/user/controllers/user.controller.js';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { requirePermission } from '@/shared/middlewares/rbac.middleware.js';
import { validateResource } from '@/shared/middlewares/validateResource.js';
import {
  listUsersQuerySchema,
  updateProfileSchema,
} from '@/modules/user/validations/user.schema.js';

const router = express.Router();

router.get('/me', authMiddleware, requirePermission('user.profile.read.own'), meController);
router.patch(
  '/me',
  authMiddleware,
  requirePermission('user.profile.update.own'),
  validateResource(updateProfileSchema),
  updateMeController,
);

// Directory listing - gated on the specific `user.manage.any` attribute
// (an ".any"/admin-level key, so only a role the catalog grants it to -
// currently just ADMIN - passes), not on the role name directly.
router.get(
  '/',
  authMiddleware,
  requirePermission('user.manage.any'),
  validateResource(listUsersQuerySchema),
  listUsersController,
);

export default router;
