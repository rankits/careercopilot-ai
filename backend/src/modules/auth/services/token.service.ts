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
  AuthTokens,
  RequestContext,
  UserTokenContext,
} from '@/modules/auth/types/auth.types.js';

const FULL_SESSION_TTL_SECONDS = parseDurationSeconds(
  jwtConfig.refreshExpiresIn,
  60 * 60 * 24 * 30,
);

const hashToken = (raw: string): string => createHash('sha256').update(raw).digest('hex');

const sessionTtlSeconds = (rememberMe: boolean): number =>
  rememberMe ? FULL_SESSION_TTL_SECONDS : securityConfig.sessions.shortSessionTtlSeconds;

const generateAccessToken = (
  user: UserTokenContext,
): { token: string; expiresInSeconds: number } => ({
  token: signAccessToken({
    sub: user.id,
    principalType: 'USER',
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion,
  }),
  expiresInSeconds: getAccessTokenTtlSeconds(),
});

/** Revokes the oldest active sessions beyond the configured cap. */
async function enforceMaxSessions(userId: number): Promise<void> {
  const activeSessions = await prisma.userSession.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  const excess = activeSessions.length - securityConfig.sessions.maxRefreshTokensPerUser;
  if (excess > 0) {
    const idsToRevoke = activeSessions.slice(0, excess).map((session) => session.id);
    await prisma.userSession.updateMany({
      where: { id: { in: idsToRevoke } },
      data: { revokedAt: new Date() },
    });
  }
}

async function createSessionAndPair(
  user: UserTokenContext,
  familyId: string,
  context: RequestContext,
  rememberMe: boolean,
): Promise<{ tokens: AuthTokens; sessionIdHash: string }> {
  const rawRefreshToken = randomBytes(64).toString('hex');
  const sessionIdHash = hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + sessionTtlSeconds(rememberMe) * 1000);

  await prisma.userSession.create({
    data: {
      userId: user.id,
      sessionId: sessionIdHash,
      familyId,
      rememberMe,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      expiresAt,
    },
  });

  await enforceMaxSessions(user.id);

  const access = generateAccessToken(user);

  return {
    tokens: {
      accessToken: access.token,
      refreshToken: rawRefreshToken,
      accessTokenExpiresInSeconds: access.expiresInSeconds,
    },
    sessionIdHash,
  };
}

/**
 * A refresh token presented after it was already rotated (revoked) is a
 * strong signal of theft/replay: revoke the entire session "family" and
 * bump tokenVersion so even currently-live access tokens stop working.
 */
async function handleReuseDetected(
  familyId: string,
  userId: number,
  context: RequestContext,
): Promise<void> {
  await prisma.userSession.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
    select: { tokenVersion: true },
  });
  await setCachedTokenVersion('USER', userId, updated.tokenVersion);
  await AuditService.write({
    userId,
    action: AuditAction.TokenReuseDetected,
    context,
    metadata: { familyId },
  });
}

export const TokenService = {
  generateAccessToken,

  /** Starts a brand-new session (new family) - used on login/registration. */
  async issueSession(
    user: UserTokenContext,
    context: RequestContext,
    rememberMe = false,
  ): Promise<AuthTokens> {
    const familyId = randomUUID();
    const { tokens } = await createSessionAndPair(user, familyId, context, rememberMe);
    return tokens;
  },

  /** Rotates an existing session's refresh token, detecting reuse. */
  async rotateSession(rawRefreshToken: string, context: RequestContext): Promise<AuthTokens> {
    const sessionIdHash = hashToken(rawRefreshToken);
    const existing = await prisma.userSession.findUnique({ where: { sessionId: sessionIdHash } });

    if (!existing) {
      throw new AppError('Invalid refresh token', 401, 'TOKEN_INVALID');
    }

    if (existing.revokedAt) {
      await handleReuseDetected(existing.familyId, existing.userId, context);
      throw new AppError(
        'This session is no longer valid. All sessions have been signed out as a precaution.',
        401,
        'TOKEN_REUSE_DETECTED',
      );
    }

    if (existing.expiresAt.getTime() < Date.now()) {
      throw new AppError('Refresh token has expired, please sign in again', 401, 'TOKEN_EXPIRED');
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: existing.userId },
      include: { role: true },
    });
    if (!dbUser) {
      throw new AppError('Account no longer exists', 401, 'ACCOUNT_NOT_FOUND');
    }

    const { tokens, sessionIdHash: newSessionIdHash } = await createSessionAndPair(
      {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role.name,
        tokenVersion: dbUser.tokenVersion,
      },
      existing.familyId,
      context,
      existing.rememberMe,
    );

    await prisma.userSession.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), replacedBySessionId: newSessionIdHash },
    });

    return tokens;
  },

  async revokeSession(rawRefreshToken: string, context: RequestContext = {}): Promise<void> {
    const sessionIdHash = hashToken(rawRefreshToken);
    const existing = await prisma.userSession.findUnique({
      where: { sessionId: sessionIdHash },
      select: { id: true, userId: true, revokedAt: true },
    });
    if (!existing || existing.revokedAt) return; // idempotent: unknown/already-revoked token is a no-op

    await prisma.userSession.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });
    await AuditService.write({ userId: existing.userId, action: AuditAction.Logout, context });
  },

  async revokeAllSessions(userId: number): Promise<void> {
    await prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  /** Invalidates every currently-live access token for this user immediately. */
  async bumpTokenVersion(userId: number): Promise<number> {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
      select: { tokenVersion: true },
    });
    await setCachedTokenVersion('USER', userId, updated.tokenVersion);
    return updated.tokenVersion;
  },
};
