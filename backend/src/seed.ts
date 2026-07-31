/**
 * Database seed script (orchestrator).
 *
 * Idempotent - safe to re-run (`npm run prisma:seed`, or automatically
 * after `prisma migrate dev`). Per-model seed logic lives in `prisma/seed/`
 * (one file per model, relational assignments alongside the model they
 * belong to - e.g. Role<->Permission assignment lives in roles.seed.ts);
 * this file only orchestrates the order they must run in and owns the
 * single shared PrismaClient instance / process exit code.
 */
import { PrismaClient } from '@prisma/client';
import { seedPermissions } from '@/seed/seed/permissions.seed.js';
import { seedRoles } from '@/seed/seed/roles.seed.js';
import { seedDefaultAdmin } from '@/seed/seed/admin.seed.js';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const permissionIdByKey = await seedPermissions(prisma);
  const roleIdByName = await seedRoles(prisma, permissionIdByKey);

  const adminRoleId = roleIdByName.get('ADMIN');
  if (!adminRoleId) {
    throw new Error('ADMIN role was not seeded - aborting default admin bootstrap');
  }

  await seedDefaultAdmin(prisma, adminRoleId);
}

main()
  .then(async () => {
    console.log('Database seeding complete');
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error('Database seeding failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
