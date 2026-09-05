import express from 'express';
import {
  changePasswordController,
  logoutAllController,
  logoutController,
  loginController,
  meController,
  refreshController,
  systemStatsController,
} from '@/modules/admin/controllers/admin.controller.js';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { requirePermission, requirePrincipalType } from '@/shared/middlewares/rbac.middleware.js';
import { validateResource } from '@/shared/middlewares/validateResource.js';
import { authRateLimiter } from '@/shared/middlewares/rateLimiter.js';
import { ADMIN_PERMISSIONS, AUTH_PERMISSIONS } from '@/shared/rbac/permission.catalog.js';
import {
  adminChangePasswordSchema,
  adminLoginSchema,
  adminLogoutSchema,
  adminRefreshTokenSchema,
} from '@/modules/admin/validations/admin.schema.js';

const router = express.Router();

// Every protected route below pairs `requirePrincipalType('ADMIN')` (the
// caller must be an Admin, not a User principal - a table-level guard,
// independent of whatever permissions their role happens to carry) with
// `requirePermission(...)` naming the ONE attribute that specific action
// actually needs (see shared/rbac/permission.catalog.ts). No shared
// "requireAdmin" blob: each route's authorization is declared where the
// route itself is, so it's auditable action-by-action instead of
// uniformly gating the whole file on role name alone.

// --- Auth (no self-registration/OTP - admins are provisioned via seed) ---
router.post('/auth/login', authRateLimiter, validateResource(adminLoginSchema), loginController);
router.post(
  '/auth/refresh-token',
  authRateLimiter,
  validateResource(adminRefreshTokenSchema),
  refreshController,
);
router.post('/auth/logout', validateResource(adminLogoutSchema), logoutController);

router.post(
  '/auth/logout-all',
  authMiddleware,
  requirePrincipalType('ADMIN'),
  requirePermission(AUTH_PERMISSIONS.UPDATE_SESSION_OWN),
  logoutAllController,
);
router.post(
  '/auth/change-password',
  authMiddleware,
  requirePrincipalType('ADMIN'),
  requirePermission(AUTH_PERMISSIONS.UPDATE_SESSION_OWN),
  validateResource(adminChangePasswordSchema),
  changePasswordController,
);
// No permission attribute: reading one's own already-authenticated
// identity isn't a permission-gated action (same precedent as GET /users/me).
router.get('/auth/me', authMiddleware, requirePrincipalType('ADMIN'), meController);

// --- Dashboard ---
router.get(
  '/stats',
  authMiddleware,
  requirePrincipalType('ADMIN'),
  requirePermission(ADMIN_PERMISSIONS.VIEW_DASHBOARD),
  systemStatsController,
);

export default router;
