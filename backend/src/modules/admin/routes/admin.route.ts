import express from "express";
import {
  changePasswordController,
  logoutAllController,
  logoutController,
  loginController,
  meController,
  refreshController,
  systemStatsController,
} from "../controllers/admin.controller.js";
import { authMiddleware } from "../../../shared/middlewares/auth.middleware.js";
import { requirePrincipalType, requireRole } from "../../../shared/middlewares/rbac.middleware.js";
import { validateResource } from "../../../shared/middlewares/validateResource.js";
import { authRateLimiter } from "../../../shared/middlewares/rateLimiter.js";
import {
  adminChangePasswordSchema,
  adminLoginSchema,
  adminLogoutSchema,
  adminRefreshTokenSchema,
} from "../validations/admin.schema.js";

const router = express.Router();

// requirePrincipalType is a defense-in-depth belt to requireRole - see
// shared/middlewares/rbac.middleware.ts for why both are applied.
const requireAdmin = [authMiddleware, requirePrincipalType("ADMIN"), requireRole("ADMIN")];

// --- Auth (no self-registration/OTP - admins are provisioned via seed) ---
router.post("/auth/login", authRateLimiter, validateResource(adminLoginSchema), loginController);
router.post(
  "/auth/refresh-token",
  authRateLimiter,
  validateResource(adminRefreshTokenSchema),
  refreshController,
);
router.post("/auth/logout", validateResource(adminLogoutSchema), logoutController);
router.post("/auth/logout-all", ...requireAdmin, logoutAllController);
router.post(
  "/auth/change-password",
  ...requireAdmin,
  validateResource(adminChangePasswordSchema),
  changePasswordController,
);
router.get("/auth/me", ...requireAdmin, meController);

// --- Dashboard ---
router.get("/stats", ...requireAdmin, systemStatsController);

export default router;
