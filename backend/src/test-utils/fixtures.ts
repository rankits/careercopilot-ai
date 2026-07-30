import { Status } from '@prisma/client';
import type { FakeAdmin, FakeUser } from '@/test-utils/fake-prisma.js';
import { fakeDb } from '@/test-utils/prisma-mock.js';
import { PasswordUtil } from '@/shared/security/password.util.js';
import { signAccessToken } from '@/shared/security/jwt.util.js';

/** Meets the app's password policy: upper + lower + digit + symbol, 8+ chars. */
export const VALID_PASSWORD = 'Str0ng!Passw0rd';

export const seedVerifiedUser = async (
  overrides: Partial<FakeUser> = {},
  password = VALID_PASSWORD,
): Promise<FakeUser> => {
  const { passwordHash, passwordSalt } = await PasswordUtil.hash(password);
  return fakeDb.seedUser({
    status: Status.Active,
    isEmailVerified: true,
    passwordHash,
    passwordSalt,
    ...overrides,
  });
};

export const seedUnverifiedUser = async (
  overrides: Partial<FakeUser> = {},
  password = VALID_PASSWORD,
): Promise<FakeUser> => {
  const { passwordHash, passwordSalt } = await PasswordUtil.hash(password);
  return fakeDb.seedUser({
    status: Status.PendingVerification,
    isEmailVerified: false,
    passwordHash,
    passwordSalt,
    ...overrides,
  });
};

export const seedAdmin = async (
  overrides: Partial<FakeAdmin> = {},
  password = VALID_PASSWORD,
): Promise<FakeAdmin> => {
  const { passwordHash, passwordSalt } = await PasswordUtil.hash(password);
  return fakeDb.seedAdmin({
    status: Status.Active,
    passwordHash,
    passwordSalt,
    ...overrides,
  });
};

/** Mints a real, verifiable access token for a seeded user - lets tests jump
 * straight to an authenticated state without re-exercising /login each time. */
export const accessTokenForUser = (user: FakeUser): string =>
  signAccessToken({
    sub: user.publicId,
    principalType: 'USER',
    email: user.email,
    role: fakeDb.roles.get(user.roleId)?.name ?? 'USER',
    tokenVersion: user.tokenVersion,
  });

export const accessTokenForAdmin = (admin: FakeAdmin): string =>
  signAccessToken({
    sub: admin.publicId,
    principalType: 'ADMIN',
    email: admin.email,
    role: fakeDb.roles.get(admin.roleId)?.name ?? 'ADMIN',
    tokenVersion: admin.tokenVersion,
  });

export const authHeader = (token: string): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
});

/** Reads a specific cookie's value out of a supertest response's Set-Cookie header(s). */
export const extractCookie = (
  setCookieHeader: string | string[] | undefined,
  name: string,
): string | undefined => {
  const lines = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader
      ? [setCookieHeader]
      : [];
  const line = lines.find((c) => c.startsWith(`${name}=`));
  return line?.split(';')[0]?.split('=').slice(1).join('=');
};
