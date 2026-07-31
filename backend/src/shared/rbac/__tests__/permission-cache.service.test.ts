import { describe, it, expect, beforeEach } from 'vitest';
import { fakeDb } from '@/test-utils/prisma-mock.js';
import { resetTestState } from '@/test-utils/reset.js';
import { PermissionCache } from '@/shared/rbac/permission-cache.service.js';

beforeEach(async () => {
  await resetTestState();
});

describe('PermissionCache.getPermissionsForRole', () => {
  describe('Given a role that exists in the seeded catalog', () => {
    describe('When resolving its permissions', () => {
      it('Then the real ROLE_PERMISSION_MAP set is returned', async () => {
        const adminPermissions = await PermissionCache.getPermissionsForRole('ADMIN');
        expect(adminPermissions).toContain('admin.dashboard.view');
        expect(adminPermissions.length).toBeGreaterThan(0);

        const userPermissions = await PermissionCache.getPermissionsForRole('USER');
        expect(userPermissions).toContain('user.profile.read.own');
        expect(userPermissions).not.toContain('admin.dashboard.view');
      });
    });
  });

  describe('Given a role name that does not exist', () => {
    describe('When resolving its permissions', () => {
      it('Then an empty array is returned rather than throwing (fail closed)', async () => {
        const permissions = await PermissionCache.getPermissionsForRole('GHOST_ROLE');
        expect(permissions).toEqual([]);
      });
    });
  });

  describe('Given a role whose permissions were already resolved once (cached)', () => {
    describe('When the underlying role permissions change without invalidating the cache', () => {
      it('Then the stale cached value is served, not the new one', async () => {
        const first = await PermissionCache.getPermissionsForRole('USER');
        expect(first).toContain('user.profile.read.own');

        fakeDb.setRolePermissions('USER', []);

        const second = await PermissionCache.getPermissionsForRole('USER');
        expect(second).toEqual(first);
      });
    });
  });
});

describe('PermissionCache.invalidateRole', () => {
  describe('Given a role whose permissions were cached, then changed', () => {
    describe('When invalidateRole is called before the next lookup', () => {
      it('Then the next lookup reflects the new permission set', async () => {
        await PermissionCache.getPermissionsForRole('USER'); // primes the cache
        fakeDb.setRolePermissions('USER', ['user.profile.read.own']);

        await PermissionCache.invalidateRole('USER');

        const refreshed = await PermissionCache.getPermissionsForRole('USER');
        expect(refreshed).toEqual(['user.profile.read.own']);
      });
    });
  });
});

describe('PermissionCache.hasPermission', () => {
  describe('Given a role that carries the permission key', () => {
    it('Then it resolves true', async () => {
      expect(await PermissionCache.hasPermission('ADMIN', 'admin.dashboard.view')).toBe(true);
    });
  });

  describe('Given a role that does not carry the permission key', () => {
    it('Then it resolves false', async () => {
      expect(await PermissionCache.hasPermission('USER', 'admin.dashboard.view')).toBe(false);
    });
  });
});
