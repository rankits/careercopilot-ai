import { prisma } from "../config/db.conf.js";
import { cacheService } from "../../infrastructure/cache/index.js";

const ROLE_PERMISSIONS_TTL_SECONDS = 60 * 60; // 1 hour
const roleKey = (roleName: string): string => `careercopilot:rbac:role-permissions:${roleName}`;

/**
 * Resolves a role's effective permission set with a cache-first lookup
 * (memory or Redis, per `CACHE_DRIVER`) and Postgres fallback, so
 * `requirePermission` middleware doesn't hit the database on every
 * request. Call `invalidateRole` whenever a role's permissions are edited
 * (e.g. from an admin endpoint) to avoid serving stale access decisions
 * for up to the TTL.
 */
export const PermissionCache = {
  async getPermissionsForRole(roleName: string): Promise<string[]> {
    const cached = await cacheService.get<string[]>(roleKey(roleName));
    if (cached) return cached;

    const role = await prisma.role.findUnique({
      where: { name: roleName },
      include: { permissions: { include: { permission: true } } },
    });

    const permissionKeys = role
      ? role.permissions.map((rolePermission) => rolePermission.permission.key)
      : [];
    await cacheService.set(roleKey(roleName), permissionKeys, ROLE_PERMISSIONS_TTL_SECONDS);
    return permissionKeys;
  },

  async invalidateRole(roleName: string): Promise<void> {
    await cacheService.delete(roleKey(roleName));
  },

  async hasPermission(roleName: string, permissionKey: string): Promise<boolean> {
    const permissions = await PermissionCache.getPermissionsForRole(roleName);
    return permissions.includes(permissionKey);
  },
};
