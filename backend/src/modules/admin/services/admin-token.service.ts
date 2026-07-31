import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { AuditAction } from '@prisma/client';
import { prisma } from '@/shared/config/db.conf.js';
import {
  signAccessToken,
  getAccessTokenTtlSeconds,
  parseDurationSeconds,
} from '@/shared/security/jwt.util.js';
import { setCachedTokenVersion } from '@/shared/security/token-version.cache.js';
import { jwtConfig } from '@/shared/config/jwt.conf.js';
import { securityConfig } from '@/shared/config/security.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { AuditService } from '@/shared/audit/audit.service.js';
import type {
  AdminTokenContext,
  AuthTokens,
  RequestContext,
} from '@/modules/admin/types/admin.types.js';

const FULL_SESSION_TTL_SECONDS = parseDurationSeconds(
  jwtConfig.refreshExpiresIn,
  60 * 60 * 24 * 30,
);

const hashToken = (raw: string): string => createHash('sha256').update(raw).digest('hex');

const sessionTtlSeconds = (rememberMe: boolean): number =>
  rememberMe ? FULL_SESSION_TTL_SECONDS : securityConfig.sessions.shortSessionTtlSeconds;

const generateAccessToken = (
  admin: AdminTokenContext,
): { token: string; expiresInSeconds: number } => ({
  token: signAccessToken({
    sub: admin.id,
    principalType: 'ADMIN',
    email: admin.email,
    role: admin.role,
    tokenVersion: admin.tokenVersion,
  }),
  expiresInSeconds: getAccessTokenTtlSeconds(),
});

async function enforceMaxSessions(adminId: number): Promise<void> {
  const activeSessions = await prisma.adminSession.findMany({
    where: { adminId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  const excess = activeSessions.length - securityConfig.sessions.maxRefreshTokensPerUser;
  if (excess > 0) {
    const idsToRevoke = activeSessions.slice(0, excess).map((session) => session.id);
    await prisma.adminSession.updateMany({
      where: { id: { in: idsToRevoke } },
      data: { revokedAt: new Date() },
    });
  }
}

async function createSessionAndPair(
  admin: AdminTokenContext,
  familyId: string,
  context: RequestContext,
  rememberMe: boolean,
): Promise<{ tokens: AuthTokens; sessionIdHash: string }> {
  const rawRefreshToken = randomBytes(64).toString('hex');
  const sessionIdHash = hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + sessionTtlSeconds(rememberMe) * 1000);

  await prisma.adminSession.create({
    data: {
      adminId: admin.id,
      sessionId: sessionIdHash,
      familyId,
      rememberMe,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      expiresAt,
    },
  });

  await enforceMaxSessions(admin.id);

  const access = generateAccessToken(admin);

  return {
    tokens: {
      accessToken: access.token,
      refreshToken: rawRefreshToken,
      accessTokenExpiresInSeconds: access.expiresInSeconds,
    },
    sessionIdHash,
  };
}

async function handleReuseDetected(
  familyId: string,
  adminId: number,
  context: RequestContext,
): Promise<void> {
  await prisma.adminSession.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  const updated = await prisma.admin.update({
    where: { id: adminId },
    data: { tokenVersion: { increment: 1 } },
    select: { tokenVersion: true },
  });
  await setCachedTokenVersion('ADMIN', adminId, updated.tokenVersion);
  await AuditService.write({
    adminId,
    action: AuditAction.TokenReuseDetected,
    context,
    metadata: { familyId },
  });
}

/** Mirrors `modules/auth/services/token.service.ts` for the Admin principal
 * type; kept as a separate (small) implementation rather than a shared
 * generic across two distinct Prisma models. */
export const AdminTokenService = {
  generateAccessToken,

  async issueSession(
    admin: AdminTokenContext,
    context: RequestContext,
    rememberMe = false,
  ): Promise<AuthTokens> {
    const familyId = randomUUID();
    const { tokens } = await createSessionAndPair(admin, familyId, context, rememberMe);
    return tokens;
  },

  async rotateSession(rawRefreshToken: string, context: RequestContext): Promise<AuthTokens> {
    const sessionIdHash = hashToken(rawRefreshToken);
    const existing = await prisma.adminSession.findUnique({ where: { sessionId: sessionIdHash } });

    if (!existing) {
      throw new AppError('Invalid refresh token', 401, 'TOKEN_INVALID');
    }

    if (existing.revokedAt) {
      await handleReuseDetected(existing.familyId, existing.adminId, context);
      throw new AppError(
        'This session is no longer valid. All sessions have been signed out as a precaution.',
        401,
        'TOKEN_REUSE_DETECTED',
      );
    }

    if (existing.expiresAt.getTime() < Date.now()) {
      throw new AppError('Refresh token has expired, please sign in again', 401, 'TOKEN_EXPIRED');
    }

    const dbAdmin = await prisma.admin.findUnique({
      where: { id: existing.adminId },
      include: { role: true },
    });
    if (!dbAdmin) {
      throw new AppError('Account no longer exists', 401, 'ACCOUNT_NOT_FOUND');
    }

    const { tokens, sessionIdHash: newSessionIdHash } = await createSessionAndPair(
      {
        id: dbAdmin.id,
        email: dbAdmin.email,
        role: dbAdmin.role.name,
        tokenVersion: dbAdmin.tokenVersion,
      },
      existing.familyId,
      context,
      existing.rememberMe,
    );

    await prisma.adminSession.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), replacedBySessionId: newSessionIdHash },
    });

    return tokens;
  },

  async revokeSession(rawRefreshToken: string, context: RequestContext = {}): Promise<void> {
    const sessionIdHash = hashToken(rawRefreshToken);
    const existing = await prisma.adminSession.findUnique({
      where: { sessionId: sessionIdHash },
      select: { id: true, adminId: true, revokedAt: true },
    });
    if (!existing || existing.revokedAt) return;

    await prisma.adminSession.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });
    await AuditService.write({ adminId: existing.adminId, action: AuditAction.Logout, context });
  },

  async revokeAllSessions(adminId: number): Promise<void> {
    await prisma.adminSession.updateMany({
      where: { adminId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async bumpTokenVersion(adminId: number): Promise<number> {
    const updated = await prisma.admin.update({
      where: { id: adminId },
      data: { tokenVersion: { increment: 1 } },
      select: { tokenVersion: true },
    });
    await setCachedTokenVersion('ADMIN', adminId, updated.tokenVersion);
    return updated.tokenVersion;
  },
};
