import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/infrastructure/cache/index.js', () => ({
  cacheService: { get: vi.fn(), set: vi.fn(async () => {}), delete: vi.fn(async () => {}) },
}));

vi.mock('@/shared/config/db.conf.js', () => ({
  prisma: {
    admin: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
  },
  default: {
    admin: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
  },
  connectDatabase: vi.fn(async () => {}),
  disconnectDatabase: vi.fn(async () => {}),
}));

import { cacheService } from '@/infrastructure/cache/index.js';
import { prisma } from '@/shared/config/db.conf.js';
import {
  getCurrentTokenVersion,
  invalidateCachedTokenVersion,
  setCachedTokenVersion,
} from '@/shared/security/token-version.cache.js';

const cacheGet = vi.mocked(cacheService.get);
const cacheSet = vi.mocked(cacheService.set);
const cacheDelete = vi.mocked(cacheService.delete);
const adminFindUnique = vi.mocked(prisma.admin.findUnique);
const userFindUnique = vi.mocked(prisma.user.findUnique);

const KEY = (type: string, id: number) => `careercopilot:auth:token-version:${type}:${id}`;

describe('token-version.cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the cached value when a hit is found', async () => {
    cacheGet.mockResolvedValue(4);
    await expect(getCurrentTokenVersion('ADMIN', 3)).resolves.toBe(4);
    expect(adminFindUnique).not.toHaveBeenCalled();
  });

  it('fetches from admin and caches it on a cache miss', async () => {
    cacheGet.mockResolvedValue(null);
    adminFindUnique.mockResolvedValue({ tokenVersion: 5 });
    await expect(getCurrentTokenVersion('ADMIN', 3)).resolves.toBe(5);
    expect(adminFindUnique).toHaveBeenCalledWith({
      where: { id: 3 },
      select: { tokenVersion: true },
    });
    expect(cacheSet).toHaveBeenCalledWith(KEY('ADMIN', 3), 5, expect.any(Number));
  });

  it('returns null when the admin does not exist', async () => {
    cacheGet.mockResolvedValue(null);
    adminFindUnique.mockResolvedValue(null);
    await expect(getCurrentTokenVersion('ADMIN', 999)).resolves.toBeNull();
    expect(cacheSet).not.toHaveBeenCalled();
  });

  it('fetches the user token version and caches it', async () => {
    cacheGet.mockResolvedValue(null);
    userFindUnique.mockResolvedValue({ tokenVersion: 2 });
    await expect(getCurrentTokenVersion('USER', 7)).resolves.toBe(2);
    expect(userFindUnique).toHaveBeenCalledWith({
      where: { id: 7 },
      select: { tokenVersion: true },
    });
    expect(cacheSet).toHaveBeenCalledWith(KEY('USER', 7), 2, expect.any(Number));
  });

  it('returns null when the user does not exist', async () => {
    cacheGet.mockResolvedValue(null);
    userFindUnique.mockResolvedValue(null);
    await expect(getCurrentTokenVersion('USER', 999)).resolves.toBeNull();
  });

  it('setCachedTokenVersion writes the version with a ttl', async () => {
    await setCachedTokenVersion('ADMIN', 3, 9);
    expect(cacheSet).toHaveBeenCalledWith(KEY('ADMIN', 3), 9, expect.any(Number));
  });

  it('invalidateCachedTokenVersion deletes the key', async () => {
    await invalidateCachedTokenVersion('USER', 7);
    expect(cacheDelete).toHaveBeenCalledWith(KEY('USER', 7));
  });
});
