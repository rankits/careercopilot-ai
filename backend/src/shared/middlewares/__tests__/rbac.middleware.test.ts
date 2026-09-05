import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { AppError } from '@/shared/utils/errors/AppError.js';
import {
  requirePermission,
  requirePrincipalType,
  requireRole,
} from '@/shared/middlewares/rbac.middleware.js';
import { PermissionCache } from '@/shared/rbac/permission-cache.service.js';

vi.mock('@/shared/rbac/permission-cache.service.js', () => ({
  PermissionCache: { getPermissionsForRole: vi.fn() },
}));

const mockReq = (user?: { role: string; principalType: 'ADMIN' | 'USER' }): Request =>
  ({
    user: user
      ? { principalId: 'principal-1', email: 'caller@example.com', tokenVersion: 0, ...user }
      : undefined,
  }) as Request;

const res = {} as Response;

/** Awaits the async `.then().catch(next)` chain inside `requirePermission`
 * before asserting on how `next` was called. */
const runAsyncMiddleware = (run: (next: (err?: unknown) => void) => void): Promise<unknown[]> =>
  new Promise((resolve) => {
    const calls: unknown[] = [];
    run((err) => {
      calls.push(err);
      resolve(calls);
    });
  });

describe('requirePrincipalType', () => {
  describe('Given no authenticated principal on the request', () => {
    it('Then next() is called with a 401 AppError', () => {
      const next = vi.fn();
      requirePrincipalType('ADMIN')(mockReq(undefined), res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0]?.[0] as AppError;
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(401);
    });
  });

  describe('Given an authenticated principal of a type not in the allowed list', () => {
    it('Then next() is called with a 403 AppError', () => {
      const next = vi.fn();
      requirePrincipalType('ADMIN')(mockReq({ principalType: 'USER', role: 'USER' }), res, next);

      const err = next.mock.calls[0]?.[0] as AppError;
      expect(err.statusCode).toBe(403);
    });
  });

  describe('Given an authenticated principal whose type is in the allowed list', () => {
    it('Then next() is called with no error', () => {
      const next = vi.fn();
      requirePrincipalType('ADMIN')(mockReq({ principalType: 'ADMIN', role: 'ADMIN' }), res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('Then it passes when multiple types are allowed and one matches', () => {
      const next = vi.fn();
      requirePrincipalType('ADMIN', 'USER')(
        mockReq({ principalType: 'USER', role: 'USER' }),
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith();
    });
  });
});

describe('requireRole', () => {
  describe('Given no authenticated principal on the request', () => {
    it('Then next() is called with a 401 AppError', () => {
      const next = vi.fn();
      requireRole('ADMIN')(mockReq(undefined), res, next);

      const err = next.mock.calls[0]?.[0] as AppError;
      expect(err.statusCode).toBe(401);
    });
  });

  describe("Given the principal's role is not in the allowed list", () => {
    it('Then next() is called with a 403 AppError naming the allowed roles', () => {
      const next = vi.fn();
      requireRole('ADMIN')(mockReq({ principalType: 'USER', role: 'USER' }), res, next);

      const err = next.mock.calls[0]?.[0] as AppError;
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain('ADMIN');
    });
  });

  describe("Given the principal's role is in the allowed list", () => {
    it('Then next() is called with no error', () => {
      const next = vi.fn();
      requireRole('ADMIN', 'SUPPORT')(
        mockReq({ principalType: 'ADMIN', role: 'SUPPORT' }),
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith();
    });
  });
});

describe('requirePermission', () => {
  beforeEach(() => {
    vi.mocked(PermissionCache.getPermissionsForRole).mockReset();
  });

  describe('Given no authenticated principal on the request', () => {
    it('Then next() is called synchronously with a 401 AppError, without consulting PermissionCache', () => {
      const next = vi.fn();
      requirePermission('admin.dashboard.view')(mockReq(undefined), res, next);

      const err = next.mock.calls[0]?.[0] as AppError;
      expect(err.statusCode).toBe(401);
      expect(PermissionCache.getPermissionsForRole).not.toHaveBeenCalled();
    });
  });

  describe("Given the caller's role carries every required permission", () => {
    it('Then next() is called with no error', async () => {
      vi.mocked(PermissionCache.getPermissionsForRole).mockResolvedValue([
        'admin.dashboard.view',
        'admin.roles.manage',
      ]);

      const calls = await runAsyncMiddleware((next) =>
        requirePermission('admin.dashboard.view')(
          mockReq({ principalType: 'ADMIN', role: 'ADMIN' }),
          res,
          next,
        ),
      );

      expect(calls).toEqual([undefined]);
    });
  });

  describe("Given the caller's role is missing one of several required permissions", () => {
    it('Then next() is called with a 403 AppError naming only the missing key(s)', async () => {
      vi.mocked(PermissionCache.getPermissionsForRole).mockResolvedValue(['admin.dashboard.view']);

      const calls = await runAsyncMiddleware((next) =>
        requirePermission('admin.dashboard.view', 'admin.roles.manage')(
          mockReq({ principalType: 'ADMIN', role: 'ADMIN' }),
          res,
          next,
        ),
      );

      const err = calls[0] as AppError;
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain('admin.roles.manage');
      expect(err.message).not.toContain('admin.dashboard.view');
    });
  });

  describe("Given the caller's role carries none of the required permissions", () => {
    it('Then a 403 is returned', async () => {
      vi.mocked(PermissionCache.getPermissionsForRole).mockResolvedValue([]);

      const calls = await runAsyncMiddleware((next) =>
        requirePermission('admin.dashboard.view')(
          mockReq({ principalType: 'USER', role: 'USER' }),
          res,
          next,
        ),
      );

      expect((calls[0] as AppError).statusCode).toBe(403);
    });
  });

  describe('Given PermissionCache.getPermissionsForRole rejects (e.g. cache/DB unavailable)', () => {
    it('Then the rejection is forwarded to next() as an error rather than swallowed or treated as a pass', async () => {
      const boom = new Error('cache unavailable');
      vi.mocked(PermissionCache.getPermissionsForRole).mockRejectedValue(boom);

      const calls = await runAsyncMiddleware((next) =>
        requirePermission('admin.dashboard.view')(
          mockReq({ principalType: 'ADMIN', role: 'ADMIN' }),
          res,
          next,
        ),
      );

      expect(calls).toEqual([boom]);
    });
  });
});
