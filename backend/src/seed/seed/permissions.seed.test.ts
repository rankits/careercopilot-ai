import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/rbac/permission.catalog.js', () => ({
  PERMISSIONS: [
    { key: 'user:read', resource: 'user', action: 'read', description: 'Read users' },
    { key: 'user:write', resource: 'user', action: 'write', description: 'Write users' },
  ],
}));
vi.mock('@prisma/client', () => ({
  PrismaClient: class {},
}));

import { seedPermissions } from '@/seed/seed/permissions.seed.js';

const upsertMock = vi.fn();

const createPrisma = (): unknown => ({
  permission: {
    upsert: upsertMock,
  },
});

describe('seedPermissions', () => {
  beforeEach(() => {
    upsertMock.mockReset();
  });

  it('upserts each permission and returns key -> id map', async () => {
    upsertMock
      .mockResolvedValueOnce({ id: 11, key: 'user:read' })
      .mockResolvedValueOnce({ id: 12, key: 'user:write' });
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const prisma = createPrisma();

    const result = await seedPermissions(prisma as never);

    expect(result.get('user:read')).toBe(11);
    expect(result.get('user:write')).toBe(12);
    expect(upsertMock).toHaveBeenCalledTimes(2);
    expect(upsertMock).toHaveBeenNthCalledWith(1, {
      where: { key: 'user:read' },
      update: { resource: 'user', action: 'read', description: 'Read users' },
      create: { key: 'user:read', resource: 'user', action: 'read', description: 'Read users' },
    });
    expect(consoleSpy).toHaveBeenCalledWith('Seeded 2 permissions');
    consoleSpy.mockRestore();
  });
});
