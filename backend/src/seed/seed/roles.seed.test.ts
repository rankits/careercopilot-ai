import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/rbac/permission.catalog.js', () => ({
  SYSTEM_ROLES: ['ADMIN', 'USER'],
  ROLE_PERMISSION_MAP: {
    ADMIN: ['user:read', 'user:write'],
    USER: ['user:read'],
  },
}));
vi.mock('@prisma/client', () => ({
  PrismaClient: class {},
}));

import { seedRoles } from '@/seed/seed/roles.seed.js';

const roleUpsertMock = vi.fn();
const deleteManyMock = vi.fn(async () => ({ count: 1 }));
const createManyMock = vi.fn(async () => ({ count: 1 }));

const createPrisma = (): unknown => ({
  role: { upsert: roleUpsertMock },
  rolePermission: {
    deleteMany: deleteManyMock,
    createMany: createManyMock,
  },
});

describe('seedRoles', () => {
  beforeEach(() => {
    roleUpsertMock.mockReset();
    deleteManyMock.mockClear();
    createManyMock.mockClear();
  });

  it('upserts roles, replaces permission assignments, and returns role id map', async () => {
    roleUpsertMock
      .mockResolvedValueOnce({ id: 101, name: 'ADMIN' })
      .mockResolvedValueOnce({ id: 102, name: 'USER' });
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const prisma = createPrisma();
    const permissionIdByKey = new Map([
      ['user:read', 1],
      ['user:write', 2],
    ]);

    const result = await seedRoles(prisma as never, permissionIdByKey);

    expect(result.get('ADMIN')).toBe(101);
    expect(result.get('USER')).toBe(102);

    expect(roleUpsertMock).toHaveBeenNthCalledWith(1, {
      where: { name: 'ADMIN' },
      update: {
        isSystem: true,
        description: 'Full platform access, including user and role management',
      },
      create: {
        name: 'ADMIN',
        description: 'Full platform access, including user and role management',
        isSystem: true,
      },
    });

    expect(deleteManyMock).toHaveBeenNthCalledWith(1, { where: { roleId: 101 } });
    expect(createManyMock).toHaveBeenNthCalledWith(1, {
      data: [
        { roleId: 101, permissionId: 1 },
        { roleId: 101, permissionId: 2 },
      ],
      skipDuplicates: true,
    });

    expect(deleteManyMock).toHaveBeenNthCalledWith(2, { where: { roleId: 102 } });
    expect(createManyMock).toHaveBeenNthCalledWith(2, {
      data: [{ roleId: 102, permissionId: 1 }],
      skipDuplicates: true,
    });

    expect(consoleSpy).toHaveBeenCalledWith('Role ADMIN: 2 permission(s) assigned');
    expect(consoleSpy).toHaveBeenCalledWith('Role USER: 1 permission(s) assigned');
    consoleSpy.mockRestore();
  });

  it('skips createMany when a role resolves to no permission ids', async () => {
    roleUpsertMock
      .mockResolvedValueOnce({ id: 201, name: 'ADMIN' })
      .mockResolvedValueOnce({ id: 202, name: 'USER' });
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const prisma = createPrisma();
    const permissionIdByKey = new Map<string, number>();

    await seedRoles(prisma as never, permissionIdByKey);

    expect(createManyMock).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('Role ADMIN: 0 permission(s) assigned');
    consoleSpy.mockRestore();
  });
});
