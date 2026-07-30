import express from 'express';
import {
  listUsersController,
  meController,
  updateMeController,
} from '@/modules/user/controllers/user.controller.js';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { requireRole } from '@/shared/middlewares/rbac.middleware.js';
import { validateResource } from '@/shared/middlewares/validateResource.js';
import {
  listUsersQuerySchema,
  updateProfileSchema,
} from '@/modules/user/validations/user.schema.js';

const router = express.Router();

router.get('/me', authMiddleware, meController);
router.patch('/me', authMiddleware, validateResource(updateProfileSchema), updateMeController);

// Admin-only directory listing - concrete example of role-guarded RBAC.
router.get(
  '/',
  authMiddleware,
  requireRole('ADMIN'),
  validateResource(listUsersQuerySchema),
  listUsersController,
);

export default router;
