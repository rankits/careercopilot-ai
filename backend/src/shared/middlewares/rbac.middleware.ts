import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { PrincipalType } from "@/shared/security/jwt.util.js";
import { AppError } from "@/shared/utils/errors/AppError.js";
import { PermissionCache } from "@/shared/rbac/permission-cache.service.js";

/**
 * Defense-in-depth guard for routes that must only ever be reachable by
 * one principal table (Admin vs User). `requireRole("ADMIN")` alone
 * already achieves this in practice (only Admin rows are ever assigned
 * the ADMIN role - see prisma/seed/roles.seed.ts), but this makes the
 * invariant explicit and survives that assumption ever being violated.
 */
export const requirePrincipalType = (...allowedTypes: PrincipalType[]): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError("Authentication required", 401));
      return;
    }
    if (!allowedTypes.includes(req.user.principalType)) {
      next(new AppError("This action is not available for this account type", 403));
      return;
    }
    next();
  };
};

/**
 * Coarse-grained guard: passes if `req.user.role` is one of `allowedRoles`.
 * Must run after `authMiddleware`.
 */
export const requireRole = (...allowedRoles: string[]): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError("Authentication required", 401));
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      next(
        new AppError(
          `This action requires one of the following roles: ${allowedRoles.join(", ")}`,
          403,
        ),
      );
      return;
    }
    next();
  };
};

/**
 * Fine-grained guard: passes only if the caller's role has been granted
 * every permission key listed. Resolves the role's permission set via
 * `PermissionCache` (cached, Postgres-backed - see prisma/seed.ts for the
 * seeded catalog). Must run after `authMiddleware`.
 */
export const requirePermission = (...requiredPermissions: string[]): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError("Authentication required", 401));
      return;
    }

    const { role } = req.user;
    PermissionCache.getPermissionsForRole(role)
      .then((granted) => {
        const missing = requiredPermissions.filter((permission) => !granted.includes(permission));
        if (missing.length > 0) {
          next(new AppError(`Missing required permission(s): ${missing.join(", ")}`, 403));
          return;
        }
        next();
      })
      .catch(next);
  };
};
