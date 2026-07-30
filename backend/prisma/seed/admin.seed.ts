import { Status, type PrismaClient } from '@prisma/client';
import { PasswordUtil } from '../../src/shared/security/password.util.js';

/**
 * Bootstraps a default Admin account from ADMIN_DEFAULT_EMAIL /
 * ADMIN_DEFAULT_PASSWORD (see .env.example) so the platform isn't
 * unmanageable on first boot. Idempotent: never overwrites an existing
 * admin's data on re-seed, only creates one if none exists yet for that
 * email.
 */
export async function seedDefaultAdmin(prisma: PrismaClient, adminRoleId: number): Promise<void> {
  const email = process.env.ADMIN_DEFAULT_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_DEFAULT_PASSWORD;

  if (!email || !password) {
    console.log(
      'ADMIN_DEFAULT_EMAIL / ADMIN_DEFAULT_PASSWORD not set - skipping default admin bootstrap',
    );
    return;
  }

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    console.log(`Default admin already exists: ${email} (left unmodified)`);
    return;
  }

  const credentials = await PasswordUtil.hash(password);
  const firstName = process.env.ADMIN_DEFAULT_FIRST_NAME?.trim() || 'Platform';
  const lastName = process.env.ADMIN_DEFAULT_LAST_NAME?.trim() || 'Admin';

  await prisma.admin.create({
    data: {
      email,
      firstName,
      lastName,
      status: Status.Active,
      roleId: adminRoleId,
      meta: {
        create: credentials,
      },
    },
  });

  console.log(
    `Default admin created: ${email} (change this password immediately after first login)`,
  );
}
