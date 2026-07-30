import type { PrismaClient } from "@prisma/client";
import {
  ROLE_PERMISSION_MAP,
  SYSTEM_ROLES,
  type SystemRole,
} from "../../src/shared/rbac/permission.catalog.js";

const ROLE_DESCRIPTIONS: Record<SystemRole, string> = {
  ADMIN: "Full platform access, including user and role management",
  USER: "Standard authenticated user with self-service access to their own resources",
};

/**
 * Upserts the ADMIN/USER roles AND their permission assignments together
 * (the "relational" part lives here rather than a separate file, since
 * role-permission assignment is inherently a role-level concern). Returns
 * role name -> id for admin.seed.ts to assign the default admin's role.
 */
export async function seedRoles(
  prisma: PrismaClient,
  permissionIdByKey: Map<string, number>,
): Promise<Map<SystemRole, number>> {
  const idByRoleName = new Map<SystemRole, number>();

  for (const roleName of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: { isSystem: true, description: ROLE_DESCRIPTIONS[roleName] },
      create: { name: roleName, description: ROLE_DESCRIPTIONS[roleName], isSystem: true },
    });
    idByRoleName.set(roleName, role.id);

    const permissionIds = ROLE_PERMISSION_MAP[roleName]
      .map((key) => permissionIdByKey.get(key))
      .filter((id): id is number => id !== undefined);

    // Wholesale replace: system roles are fully code-managed, so re-running
    // the seed after editing the catalog keeps the DB in sync (additions
    // AND removals) rather than only ever appending.
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
        skipDuplicates: true,
      });
    }

    console.log(`Role ${roleName}: ${permissionIds.length} permission(s) assigned`);
  }

  return idByRoleName;
}
