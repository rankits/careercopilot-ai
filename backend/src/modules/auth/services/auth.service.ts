import { Status, AuditAction, OtpPurpose } from '@prisma/client';
import { authRepository, type UserWithRole } from '@/modules/auth/repositories/auth.repository.js';
import { PasswordUtil } from '@/shared/security/password.util.js';
import { OtpService } from '@/modules/auth/services/otp.service.js';
import { TokenService } from '@/modules/auth/services/token.service.js';
import {
  GENERIC_OTP_SENT_MESSAGE,
  OTP_PURPOSE_LABELS,
} from '@/modules/auth/constants/auth.constant.js';
import { toSafeUser, toTokenContext } from '@/modules/auth/utils/auth.mapper.js';
import { securityConfig } from '@/shared/config/security.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { AuditService } from '@/shared/audit/audit.service.js';
import { EmailQueue } from '@/queues/email.queue.js';
import { cacheService, CacheKeys, CacheTTL } from '@/infrastructure/cache/index.js';
import {
  messageBus,
  MessageExchanges,
  MessageRoutingKeys,
} from '@/infrastructure/messaging/index.js';
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  LoginOtpRequestInput,
  LoginOtpVerifyInput,
  LogoutInput,
  RegisterInput,
  ResendOtpInput,
  ResetPasswordInput,
} from '@/modules/auth/validations/auth.schema.js';
import type {
  AuthSession,
  AuthTokens,
  RequestContext,
  SafeUser,
} from '@/modules/auth/types/auth.types.js';
import { isDevelopment } from '@/shared/config/env.conf.js';
import { logger } from '@/shared/logger/logger.js';

const assertLoginable = (user: UserWithRole): void => {
  if (!user.isEmailVerified || user.status === Status.PendingVerification) {
    throw new AppError('Please verify your email before signing in', 403, 'EMAIL_NOT_VERIFIED');
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

const verifyPassword = async (userId: number, plain: string): Promise<boolean> => {
  const credentials = await authRepository.getPasswordCredentials(userId);
  if (!credentials) return false; // fail closed on a data anomaly, never treat as a bypass
  return PasswordUtil.verify(plain, credentials.passwordHash, credentials.passwordSalt);
};

const issueAndSendOtp = async (
  user: UserWithRole,
  purpose: OtpPurpose,
  context: RequestContext,
): Promise<void> => {
  const code = await OtpService.issue(purpose, user.email);

  if (!isDevelopment) {
    await EmailQueue.sendOtpEmail({
      to: user.email,
      firstName: user.firstName,
      code,
      purposeLabel: OTP_PURPOSE_LABELS[purpose],
      expiresInMinutes: Math.round(securityConfig.otp.ttlSeconds / 60),
    });
  }
  await AuditService.write({
    userId: user.id,
    action: AuditAction.OtpRequested,
    context,
    metadata: { purpose },
  });
};

const consumeOtpOrThrow = async (
  purpose: OtpPurpose,
  user: UserWithRole,
  code: string,
  context: RequestContext,
  invalidMessage: string,
): Promise<void> => {
  const isValid = await OtpService.verify(purpose, user.email, code);
  if (!isValid) {
    await AuditService.write({
      userId: user.id,
      action: AuditAction.OtpFailed,
      context,
      metadata: { purpose },
    });
    throw new AppError(invalidMessage, 400);
  }

  await AuditService.write({
    userId: user.id,
    action: AuditAction.OtpVerified,
    context,
    metadata: { purpose },
  });
};

const cacheUserSession = async (user: SafeUser): Promise<void> => {
  await cacheService.set(CacheKeys.AUTH.USER_SESSION(user.id), user, CacheTTL.SEVEN_DAYS);
};

const publishAuthUpdated = async (
  user: UserWithRole,
  reason: 'REGISTERED' | 'PASSWORD_CHANGED' | 'PASSWORD_RESET',
): Promise<void> => {
  await messageBus
    .publishEvent(MessageExchanges.DOMAIN_EVENTS, MessageRoutingKeys.AUTH_UPDATED, {
      userId: user.id,
      email: user.email,
      reason,
      timestamp: new Date().toISOString(),
    })
    .catch((err: unknown) =>
      logger.warn(
        { err, event: 'auth.publish_failed', reason: 'auth.updated' },
        'Failed to publish auth.updated event',
      ),
    );
};

export const register = async (
  input: RegisterInput,
  context: RequestContext,
): Promise<AuthSession> => {
  const existing = await authRepository.findUserByEmail(input.email);

  if (existing?.isEmailVerified) {
    throw new AppError('An account with this email already exists', 409, 'CONFLICT');
  }

  const credentials = await PasswordUtil.hash(input.password);

  const user = existing
    ? await authRepository.updatePendingUser(existing.id, {
        ...credentials,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
      })
    : await authRepository.createPendingUser({
        email: input.email,
        ...credentials,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
      });

  const verifiedUser = await authRepository.markEmailVerified(user.id);
  await AuditService.write({ userId: user.id, action: AuditAction.Register, context });

  await authRepository.recordSuccessfulLogin(verifiedUser.id, context.ipAddress);
  await AuditService.write({
    userId: verifiedUser.id,
    action: AuditAction.LoginSuccess,
    context,
    metadata: { via: 'REGISTERED' },
  });

  const tokens = await TokenService.issueSession(toTokenContext(verifiedUser), context);
  await EmailQueue.sendWelcomeEmail({ to: verifiedUser.email, firstName: verifiedUser.firstName });
  await publishAuthUpdated(verifiedUser, 'REGISTERED');

  const safeUser = toSafeUser(verifiedUser);
  await cacheUserSession(safeUser);
  return { user: safeUser, tokens };
};

export const resendOtp = async (
  input: ResendOtpInput,
  context: RequestContext,
): Promise<{ message: string }> => {
  const user = await authRepository.findUserByEmail(input.email);
  if (!user || !user.isEmailVerified) {
    return { message: GENERIC_OTP_SENT_MESSAGE };
  }

  await issueAndSendOtp(user, input.purpose, context);
  return { message: GENERIC_OTP_SENT_MESSAGE };
};

export const login = async (input: LoginInput, context: RequestContext): Promise<AuthSession> => {
  const user = await authRepository.findUserByEmail(input.email);
  if (!user) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    throw new AppError(
      `Too many failed attempts. Try again after ${user.lockedUntil.toISOString()}`,
      423,
      'ACCOUNT_LOCKED',
    );
  }

  const passwordValid = await verifyPassword(user.id, input.password);
  if (!passwordValid) {
    const { lockedUntil } = await authRepository.recordFailedLogin(user.id);
    await AuditService.write({ userId: user.id, action: AuditAction.LoginFailed, context });
    if (lockedUntil) {
      await AuditService.write({
        userId: user.id,
        action: AuditAction.AccountLocked,
        context,
        metadata: { lockedUntil },
      });
    }
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  assertLoginable(user);

  await authRepository.recordSuccessfulLogin(user.id, context.ipAddress);
  await AuditService.write({
    userId: user.id,
    action: AuditAction.LoginSuccess,
    context,
    metadata: { via: 'PASSWORD' },
  });

  const tokens = await TokenService.issueSession(toTokenContext(user), context, input.rememberMe);
  const safeUser = toSafeUser(user);
  await cacheUserSession(safeUser);

  messageBus
    .publishEvent(MessageExchanges.DOMAIN_EVENTS, MessageRoutingKeys.AUTH_SIGNIN, {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
    })
    .catch((err: unknown) =>
      logger.warn(
        { err, event: 'auth.publish_failed', reason: 'auth.signin' },
        'Failed to publish signin event',
      ),
    );

  return { user: safeUser, tokens };
};

export const requestLoginOtp = async (
  input: LoginOtpRequestInput,
  context: RequestContext,
): Promise<{ message: string }> => {
  const user = await authRepository.findUserByEmail(input.email);
  if (!user || !user.isEmailVerified || user.status !== Status.Active) {
    return { message: GENERIC_OTP_SENT_MESSAGE };
  }

  await issueAndSendOtp(user, OtpPurpose.Login, context);
  return { message: GENERIC_OTP_SENT_MESSAGE };
};

export const verifyLoginOtp = async (
  input: LoginOtpVerifyInput,
  context: RequestContext,
): Promise<AuthSession> => {
  const user = await authRepository.findUserByEmail(input.email);
  if (!user) {
    throw new AppError('Invalid email or code', 401, 'INVALID_CREDENTIALS');
  }

  await consumeOtpOrThrow(OtpPurpose.Login, user, input.code, context, 'Invalid or expired code');
  assertLoginable(user);

  await authRepository.recordSuccessfulLogin(user.id, context.ipAddress);
  await AuditService.write({
    userId: user.id,
    action: AuditAction.LoginSuccess,
    context,
    metadata: { via: 'OTP' },
  });

  const tokens = await TokenService.issueSession(toTokenContext(user), context, input.rememberMe);
  const safeUser = toSafeUser(user);
  await cacheUserSession(safeUser);
  return { user: safeUser, tokens };
};

export const forgotPassword = async (
  input: ForgotPasswordInput,
  context: RequestContext,
): Promise<{ message: string }> => {
  const user = await authRepository.findUserByEmail(input.email);
  if (!user || !user.isEmailVerified) {
    return { message: GENERIC_OTP_SENT_MESSAGE };
  }

  await issueAndSendOtp(user, OtpPurpose.PasswordReset, context);
  await AuditService.write({
    userId: user.id,
    action: AuditAction.PasswordResetRequested,
    context,
  });

  return { message: GENERIC_OTP_SENT_MESSAGE };
};

export const resetPassword = async (
  input: ResetPasswordInput,
  context: RequestContext,
): Promise<{ message: string }> => {
  const user = await authRepository.findUserByEmail(input.email);
  if (!user) {
    throw new AppError('Invalid email or code', 400);
  }

  await consumeOtpOrThrow(
    OtpPurpose.PasswordReset,
    user,
    input.code,
    context,
    'Invalid or expired code',
  );

  const credentials = await PasswordUtil.hash(input.newPassword);
  await authRepository.updatePassword(user.id, credentials);
  await authRepository.resetFailedLoginAttempts(user.id);

  // A password reset is a strong enough signal to distrust every existing
  // session, not just future refreshes.
  await TokenService.revokeAllSessions(user.id);
  await TokenService.bumpTokenVersion(user.id);

  await AuditService.write({ userId: user.id, action: AuditAction.PasswordResetSuccess, context });
  await EmailQueue.sendSecurityAlertEmail({
    to: user.email,
    firstName: user.firstName,
    eventLabel: 'Your password was reset',
    ipAddress: context.ipAddress,
  });
  await publishAuthUpdated(user, 'PASSWORD_RESET');

  return { message: 'Password has been reset. Please sign in with your new password.' };
};

export const changePassword = async (
  principalId: number,
  input: ChangePasswordInput,
  context: RequestContext,
): Promise<{ message: string }> => {
  const user = await authRepository.findUserById(principalId);
  if (!user) {
    throw new AppError('Account not found', 404);
  }

  const isValid = await verifyPassword(user.id, input.currentPassword);
  if (!isValid) {
    throw new AppError('Current password is incorrect', 401, 'INVALID_CREDENTIALS');
  }

  const credentials = await PasswordUtil.hash(input.newPassword);
  await authRepository.updatePassword(user.id, credentials);

  await TokenService.revokeAllSessions(user.id);
  await TokenService.bumpTokenVersion(user.id);

  await AuditService.write({ userId: user.id, action: AuditAction.PasswordChanged, context });
  await EmailQueue.sendSecurityAlertEmail({
    to: user.email,
    firstName: user.firstName,
    eventLabel: 'Your password was changed',
    ipAddress: context.ipAddress,
  });
  await publishAuthUpdated(user, 'PASSWORD_CHANGED');

  return { message: 'Password changed. You have been signed out of all other sessions.' };
};

export const refreshSession = async (
  refreshToken: string,
  context: RequestContext,
): Promise<AuthTokens> => {
  return TokenService.rotateSession(refreshToken, context);
};

export const logout = async (
  input: LogoutInput,
  refreshTokenFromCookie: string | undefined,
  context: RequestContext,
): Promise<{ message: string }> => {
  const refreshToken = refreshTokenFromCookie ?? input.refreshToken;
  if (refreshToken) {
    await TokenService.revokeSession(refreshToken, context);
  }
  return { message: 'Logged out successfully' };
};

export const logoutAll = async (
  principalId: number,
  context: RequestContext,
): Promise<{ message: string }> => {
  const user = await authRepository.findUserById(principalId);
  if (!user) {
    throw new AppError('Account not found', 404);
  }

  await TokenService.revokeAllSessions(user.id);
  await TokenService.bumpTokenVersion(user.id);
  await AuditService.write({ userId: user.id, action: AuditAction.LogoutAll, context });
  return { message: 'Logged out from all devices' };
};

export const getCurrentUser = async (principalId: number): Promise<SafeUser> => {
  const user = await authRepository.findUserById(principalId);
  if (!user) {
    throw new AppError('Account not found', 404);
  }
  return toSafeUser(user);
};

export default {
  register,
  resendOtp,
  login,
  requestLoginOtp,
  verifyLoginOtp,
  forgotPassword,
  resetPassword,
  changePassword,
  refreshSession,
  logout,
  logoutAll,
  getCurrentUser,
};
