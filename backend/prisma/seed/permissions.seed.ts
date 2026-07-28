import type { PrismaClient } from "@prisma/client";
import { PERMISSIONS } from "../../src/shared/rbac/permission.catalog.js";

/** Upserts the permission catalog; returns permission key -> id for roles.seed.ts to assign. */
export async function seedPermissions(prisma: PrismaClient): Promise<Map<string, number>> {
  const idByKey = new Map<string, number>();

  for (const permission of PERMISSIONS) {
    const record = await prisma.permission.upsert({
      where: { key: permission.key },
      update: {
        resource: permission.resource,
        action: permission.action,
        description: permission.description,
      },
      create: permission,
    });
    idByKey.set(record.key, record.id);
  }

  console.log(`Seeded ${idByKey.size} permissions`);
  return idByKey;
}
