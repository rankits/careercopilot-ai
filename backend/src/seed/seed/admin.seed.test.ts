import { beforeEach, describe, expect, it, vi } from 'vitest';

const { hash } = vi.hoisted(() => ({
  hash: vi.fn(async (password: string) => ({ hash: `hashed:${password}`, salt: 'salt' })),
}));
vi.mock('@/shared/security/password.util.js', () => ({
  PasswordUtil: { hash },
}));
vi.mock('@prisma/client', () => ({
  Status: { Active: 'ACTIVE' },
  PrismaClient: class {},
}));

import { seedDefaultAdmin } from '@/seed/seed/admin.seed.js';

type AdminPrisma = {
  admin: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

const createPrisma = (findResult: unknown | null): AdminPrisma => ({
  admin: {
    findUnique: vi.fn().mockResolvedValue(findResult),
    create: vi.fn().mockResolvedValue({ id: 'admin-1' }),
  },
});

describe('seedDefaultAdmin', () => {
  beforeEach(() => {
    delete process.env.ADMIN_DEFAULT_EMAIL;
    delete process.env.ADMIN_DEFAULT_PASSWORD;
    delete process.env.ADMIN_DEFAULT_FIRST_NAME;
    delete process.env.ADMIN_DEFAULT_LAST_NAME;
    hash.mockClear();
  });

  it('skips bootstrap when required env vars are unset', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const prisma = createPrisma(null);

    await seedDefaultAdmin(prisma as never, 1);

    expect(hash).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      'ADMIN_DEFAULT_EMAIL / ADMIN_DEFAULT_PASSWORD not set - skipping default admin bootstrap',
    );
    consoleSpy.mockRestore();
  });

  it('leaves an existing admin unmodified', async () => {
    process.env.ADMIN_DEFAULT_EMAIL = 'ADMIN@careercopilot.dev';
    process.env.ADMIN_DEFAULT_PASSWORD = 'SuperSecret123!';
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const prisma = createPrisma({ id: 1, email: 'admin@careercopilot.dev' });

    await seedDefaultAdmin(prisma as never, 1);

    expect(prisma.admin.create).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Default admin already exists: admin@careercopilot.dev (left unmodified)',
    );
    expect(prisma.admin.findUnique).toHaveBeenCalledWith({
      where: { email: 'admin@careercopilot.dev' },
    });
    consoleSpy.mockRestore();
  });

  it('creates a default admin with hashed credentials and meta', async () => {
    process.env.ADMIN_DEFAULT_EMAIL = 'admin@careercopilot.dev';
    process.env.ADMIN_DEFAULT_PASSWORD = 'SuperSecret123!';
    process.env.ADMIN_DEFAULT_FIRST_NAME = 'Ada';
    process.env.ADMIN_DEFAULT_LAST_NAME = 'Lovelace';
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const prisma = createPrisma(null);

    await seedDefaultAdmin(prisma as never, 7);

    expect(hash).toHaveBeenCalledWith('SuperSecret123!');
    expect(prisma.admin.create).toHaveBeenCalledWith({
      data: {
        email: 'admin@careercopilot.dev',
        firstName: 'Ada',
        lastName: 'Lovelace',
        status: 'ACTIVE',
        roleId: 7,
        meta: { create: { hash: 'hashed:SuperSecret123!', salt: 'salt' } },
      },
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      'Default admin created: admin@careercopilot.dev (change this password immediately after first login)',
    );
    consoleSpy.mockRestore();
  });

  it('falls back to default first/last name when env is unset', async () => {
    process.env.ADMIN_DEFAULT_EMAIL = 'admin@careercopilot.dev';
    process.env.ADMIN_DEFAULT_PASSWORD = 'SuperSecret123!';
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const prisma = createPrisma(null);

    await seedDefaultAdmin(prisma as never, 3);

    const call = prisma.admin.create.mock.calls[0][0] as {
      data: { firstName: string; lastName: string };
    };
    expect(call.data.firstName).toBe('Platform');
    expect(call.data.lastName).toBe('Admin');
    consoleSpy.mockRestore();
  });
});
