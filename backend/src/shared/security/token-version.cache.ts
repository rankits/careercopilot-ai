import { cacheService } from '@/infrastructure/cache/index.js';
import { prisma } from '@/shared/config/db.conf.js';
import type { PrincipalType } from '@/shared/security/jwt.util.js';

const TTL_SECONDS = 300;
const key = (principalType: PrincipalType, publicId: string): string =>
  `careercopilot:auth:token-version:${principalType}:${publicId}`;

const fetchTokenVersion = async (
  principalType: PrincipalType,
  publicId: string,
): Promise<number | null> => {
  if (principalType === 'ADMIN') {
    const admin = await prisma.admin.findUnique({
      where: { publicId },
      select: { tokenVersion: true },
    });
    return admin?.tokenVersion ?? null;
  }
  const user = await prisma.user.findUnique({
    where: { publicId },
    select: { tokenVersion: true },
  });
  return user?.tokenVersion ?? null;
};

/**
 * Fast-path lookup for the "is this access token still current" check that
 * runs on every authenticated request, keyed by the JWT's `publicId` +
 * principal type. Backed by Postgres (`Admin.tokenVersion` /
 * `User.tokenVersion`) with a short cache in front (memory or Redis,
 * depending on `CACHE_DRIVER` - see infrastructure/cache) so bumping it
 * (password change, reset, logout-all) is visible within TTL_SECONDS even
 * from other processes when the redis driver is active.
 */
export const getCurrentTokenVersion = async (
  principalType: PrincipalType,
  publicId: string,
): Promise<number | null> => {
  const cached = await cacheService.get<number>(key(principalType, publicId));
  if (cached !== null) return cached;

  const tokenVersion = await fetchTokenVersion(principalType, publicId);
  if (tokenVersion === null) return null;

  await cacheService.set(key(principalType, publicId), tokenVersion, TTL_SECONDS);
  return tokenVersion;
};

export const setCachedTokenVersion = async (
  principalType: PrincipalType,
  publicId: string,
  version: number,
): Promise<void> => {
  await cacheService.set(key(principalType, publicId), version, TTL_SECONDS);
};

export const invalidateCachedTokenVersion = async (
  principalType: PrincipalType,
  publicId: string,
): Promise<void> => {
  await cacheService.delete(key(principalType, publicId));
};
