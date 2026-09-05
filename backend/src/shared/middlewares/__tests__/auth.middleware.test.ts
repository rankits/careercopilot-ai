import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '@/shared/utils/errors/AppError.js';

const jwtUtil = vi.hoisted(() => ({ verifyAccessToken: vi.fn() }));
vi.mock('@/shared/security/jwt.util.js', () => jwtUtil);

const tokenVersionMock = vi.hoisted(() => ({ getCurrentTokenVersion: vi.fn() }));
vi.mock('@/shared/security/token-version.cache.js', () => tokenVersionMock);

import { authMiddleware, optionalAuthMiddleware } from '@/shared/middlewares/auth.middleware.js';

const req = (header?: string) => ({ headers: { authorization: header } }) as Request;
const res = {} as Response;

const run = async (r: Request) => {
  const next = vi.fn() as unknown as NextFunction;
  await authMiddleware(r, res, next);
  return next;
};

const payload = { sub: 1, principalType: 'USER', email: 'a@b.com', role: 'USER', tokenVersion: 0 };

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a missing authorization header', async () => {
    const next = await run(req(undefined));
    const err = next.mock.calls[0][0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('TOKEN_MISSING');
  });

  it('rejects a malformed (non-Bearer) header', async () => {
    const next = await run(req('Basic abc'));
    expect((next.mock.calls[0][0] as AppError).code).toBe('TOKEN_MISSING');
  });

  it('rejects an empty token after the Bearer prefix', async () => {
    const next = await run(req('Bearer   '));
    expect((next.mock.calls[0][0] as AppError).code).toBe('TOKEN_MISSING');
  });

  it('attaches req.user and calls next() on success', async () => {
    jwtUtil.verifyAccessToken.mockReturnValue(payload);
    tokenVersionMock.getCurrentTokenVersion.mockResolvedValue(0);

    const r = req('Bearer valid.token');
    const next = await run(r);
    expect(next).toHaveBeenCalledWith();
    expect(r.user).toEqual({
      principalId: 1,
      principalType: 'USER',
      email: 'a@b.com',
      role: 'USER',
      tokenVersion: 0,
    });
  });

  it('rejects when the account no longer exists (null version)', async () => {
    jwtUtil.verifyAccessToken.mockReturnValue(payload);
    tokenVersionMock.getCurrentTokenVersion.mockResolvedValue(null);
    const next = await run(req('Bearer valid'));
    expect((next.mock.calls[0][0] as AppError).code).toBe('ACCOUNT_NOT_FOUND');
  });

  it('rejects when the token version is stale (revoked)', async () => {
    jwtUtil.verifyAccessToken.mockReturnValue(payload);
    tokenVersionMock.getCurrentTokenVersion.mockResolvedValue(99);
    const next = await run(req('Bearer valid'));
    expect((next.mock.calls[0][0] as AppError).code).toBe('TOKEN_REVOKED');
  });

  it('forwards an AppError thrown by verification as-is', async () => {
    const appErr = new AppError('downstream', 400, 'CUSTOM');
    jwtUtil.verifyAccessToken.mockImplementation(() => {
      throw appErr;
    });
    const next = await run(req('Bearer x'));
    expect(next.mock.calls[0][0]).toBe(appErr);
  });

  it('maps a TokenExpiredError to TOKEN_EXPIRED', async () => {
    const e = new Error('jwt expired');
    e.name = 'TokenExpiredError';
    jwtUtil.verifyAccessToken.mockImplementation(() => {
      throw e;
    });
    const next = await run(req('Bearer x'));
    const err = next.mock.calls[0][0] as AppError;
    expect(err.code).toBe('TOKEN_EXPIRED');
    expect(err.statusCode).toBe(401);
  });

  it('maps a JsonWebTokenError to TOKEN_INVALID', async () => {
    const e = new Error('invalid sig');
    e.name = 'JsonWebTokenError';
    jwtUtil.verifyAccessToken.mockImplementation(() => {
      throw e;
    });
    const next = await run(req('Bearer x'));
    expect((next.mock.calls[0][0] as AppError).code).toBe('TOKEN_INVALID');
  });

  it('maps a NotBeforeError to TOKEN_INVALID', async () => {
    const e = new Error('not active');
    e.name = 'NotBeforeError';
    jwtUtil.verifyAccessToken.mockImplementation(() => {
      throw e;
    });
    const next = await run(req('Bearer x'));
    expect((next.mock.calls[0][0] as AppError).code).toBe('TOKEN_INVALID');
  });

  it('forwards a generic Error as itself', async () => {
    const e = new Error('generic');
    jwtUtil.verifyAccessToken.mockImplementation(() => {
      throw e;
    });
    const next = await run(req('Bearer x'));
    expect(next.mock.calls[0][0]).toBe(e);
  });

  it('wraps a non-Error throw into a generic auth failure', async () => {
    jwtUtil.verifyAccessToken.mockImplementation(() => {
      throw 'boom';
    });
    const next = await run(req('Bearer x'));
    const err = next.mock.calls[0][0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Authentication failed');
  });
});

describe('optionalAuthMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes through without auth when no header is present', async () => {
    const next = vi.fn() as unknown as NextFunction;
    await optionalAuthMiddleware(req(undefined), res, next);
    expect(next).toHaveBeenCalledWith();
    expect(jwtUtil.verifyAccessToken).not.toHaveBeenCalled();
  });

  it('delegates to authMiddleware when a Bearer header is present', async () => {
    jwtUtil.verifyAccessToken.mockReturnValue(payload);
    tokenVersionMock.getCurrentTokenVersion.mockResolvedValue(0);
    const next = vi.fn() as unknown as NextFunction;
    const r = req('Bearer valid');
    await optionalAuthMiddleware(r, res, next);
    expect(jwtUtil.verifyAccessToken).toHaveBeenCalled();
    expect(r.user).toBeDefined();
  });
});
