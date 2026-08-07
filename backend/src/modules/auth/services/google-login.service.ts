import { AuditAction, Status } from '@prisma/client';

import { googleLoginAdapter } from '@/modules/auth/providers/google-login.adapter.js';
import { authRepository, type UserWithRole } from '@/modules/auth/repositories/auth.repository.js';
import { GoogleLoginTransactionService } from '@/modules/auth/services/google-login-transaction.service.js';
import { TokenService } from '@/modules/auth/services/token.service.js';
import type { AuthSession, RequestContext } from '@/modules/auth/types/auth.types.js';
import { toSafeUser, toTokenContext } from '@/modules/auth/utils/auth.mapper.js';
import { AuditService } from '@/shared/audit/audit.service.js';
import { cacheService, CacheKeys, CacheTTL } from '@/infrastructure/cache/index.js';
import {
  messageBus,
  MessageExchanges,
  MessageRoutingKeys,
} from '@/infrastructure/messaging/index.js';
import { env } from '@/shared/config/env.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

const SAFE_RETURN_PATH = /^\/(?!\/)[A-Za-z0-9\-._~!$&'()*+,;=:@/%?]*$/;

const assertNotBlocked = (user: UserWithRole): void => {
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    throw new AppError(
      `Too many failed attempts. Try again after ${user.lockedUntil.toISOString()}`,
      423,
      'ACCOUNT_LOCKED',
    );
  }
  if (user.status === Status.Suspended) {
    throw new AppError(
      'This account has been suspended. Contact support.',
      403,
      'ACCOUNT_SUSPENDED',
    );
  }
  if (user.status === Status.Deactivated) {
    throw new AppError('This account has been deactivated.', 403, 'ACCOUNT_DEACTIVATED');
  }
};

const assertLoginable = (user: UserWithRole): void => {
  assertNotBlocked(user);
  if (!user.isEmailVerified || user.status === Status.PendingVerification) {
    throw new AppError('Please verify your email before signing in', 403, 'EMAIL_NOT_VERIFIED');
  }
};

const normalizeReturnPath = (returnPath?: string): string => {
  if (!returnPath || !SAFE_RETURN_PATH.test(returnPath)) return '/app';
  return returnPath;
};

const cacheUserSession = async (user: ReturnType<typeof toSafeUser>): Promise<void> => {
  await cacheService.set(CacheKeys.AUTH.USER_SESSION(user.id), user, CacheTTL.SEVEN_DAYS);
};

export const startGoogleLogin = async (input: {
  returnPath?: string;
}): Promise<{ authorizationUrl: string }> => {
  if (!env.GOOGLE_LOGIN_ENABLED) {
    throw new AppError('Google sign-in is disabled', 403, 'GOOGLE_LOGIN_DISABLED');
  }

  const transaction = await GoogleLoginTransactionService.create(
    normalizeReturnPath(input.returnPath),
  );
  const authorizationUrl = googleLoginAdapter.createAuthorizationUrl({
    state: transaction.authorizationUrlState,
    codeChallenge: transaction.codeChallenge,
  });

  return { authorizationUrl };
};

export const completeGoogleLogin = async (
  input: { code: string; state: string },
  context: RequestContext,
): Promise<AuthSession & { returnPath: string }> => {
  if (!env.GOOGLE_LOGIN_ENABLED) {
    throw new AppError('Google sign-in is disabled', 403, 'GOOGLE_LOGIN_DISABLED');
  }

  const transaction = await GoogleLoginTransactionService.consume(input.state);
  const identity = await googleLoginAdapter.exchangeAuthorizationCode({
    code: input.code,
    codeVerifier: transaction.codeVerifier,
  });

  let user = await authRepository.findUserByGoogleSub(identity.googleSub);
  let linked = false;
  let created = false;

  if (!user) {
    const byEmail = await authRepository.findUserByEmail(identity.email);
    if (byEmail) {
      assertNotBlocked(byEmail);
      if (byEmail.googleSub && byEmail.googleSub !== identity.googleSub) {
        throw new AppError(
          'This email is already linked to a different Google account',
          409,
          'GOOGLE_LOGIN_ACCOUNT_CONFLICT',
        );
      }
      const conflict = await authRepository.findUserByGoogleSub(identity.googleSub);
      if (conflict && conflict.id !== byEmail.id) {
        throw new AppError(
          'This Google account is already linked to another user',
          409,
          'GOOGLE_LOGIN_ACCOUNT_CONFLICT',
        );
      }
      user = await authRepository.linkGoogleSub(byEmail.id, identity.googleSub, identity.avatarUrl);
      linked = true;
    } else {
      user = await authRepository.createGoogleUser({
        email: identity.email,
        firstName: identity.firstName,
        lastName: identity.lastName,
        googleSub: identity.googleSub,
        profileImage: identity.avatarUrl,
      });
      created = true;
    }
  }

  assertLoginable(user);

  await authRepository.recordSuccessfulLogin(user.id, context.ipAddress);
  await AuditService.write({
    userId: user.id,
    action: AuditAction.LoginSuccess,
    context,
    metadata: { via: 'GOOGLE', created, linked },
  });

  const tokens = await TokenService.issueSession(toTokenContext(user), context, true);
  const safeUser = toSafeUser(user);
  await cacheUserSession(safeUser);

  messageBus
    .publishEvent(MessageExchanges.DOMAIN_EVENTS, MessageRoutingKeys.AUTH_SIGNIN, {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
      via: 'GOOGLE',
    })
    .catch((err: unknown) => console.error('[GoogleLogin] Failed to publish signin event:', err));

  return { user: safeUser, tokens, returnPath: transaction.returnPath };
};
