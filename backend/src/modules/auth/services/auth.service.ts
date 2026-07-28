import { Status, AuditAction, OtpPurpose } from "@prisma/client";
import { authRepository, type UserWithRole } from "../repositories/auth.repository.js";
import { PasswordUtil } from "../../../shared/security/password.util.js";
import { OtpService } from "./otp.service.js";
import { TokenService } from "./token.service.js";
import { GENERIC_OTP_SENT_MESSAGE, OTP_PURPOSE_LABELS } from "../constants/auth.constant.js";
import { toSafeUser, toTokenContext } from "../utils/auth.mapper.js";
import { securityConfig } from "../../../shared/config/security.conf.js";
import { AppError } from "../../../shared/utils/errors/AppError.js";
import { AuditService } from "../../../shared/audit/audit.service.js";
import { EmailQueue } from "../../../queues/email.queue.js";
import { cacheService, CacheKeys, CacheTTL } from "../../../infrastructure/cache/index.js";
import {
  messageBus,
  MessageExchanges,
  MessageRoutingKeys,
} from "../../../infrastructure/messaging/index.js";
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
  VerifyRegistrationOtpInput,
} from "../validations/auth.schema.js";
import type { AuthSession, AuthTokens, RequestContext, SafeUser } from "../types/auth.types.js";

const assertLoginable = (user: UserWithRole): void => {
  if (!user.isEmailVerified || user.status === Status.PendingVerification) {
    throw new AppError("Please verify your email before signing in", 403, "EMAIL_NOT_VERIFIED");
  }
  if (user.status === Status.Suspended) {
    throw new AppError(
      "This account has been suspended. Contact support.",
      403,
      "ACCOUNT_SUSPENDED",
    );
  }
  if (user.status === Status.Deactivated) {
    throw new AppError("This account has been deactivated.", 403, "ACCOUNT_DEACTIVATED");
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
  await EmailQueue.sendOtpEmail({
    to: user.email,
    firstName: user.firstName,
    code,
    purposeLabel: OTP_PURPOSE_LABELS[purpose],
    expiresInMinutes: Math.round(securityConfig.otp.ttlSeconds / 60),
  });
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
  reason: "REGISTERED" | "PASSWORD_CHANGED" | "PASSWORD_RESET",
): Promise<void> => {
  await messageBus
    .publishEvent(MessageExchanges.DOMAIN_EVENTS, MessageRoutingKeys.AUTH_UPDATED, {
      userId: user.publicId,
      email: user.email,
      reason,
      timestamp: new Date().toISOString(),
    })
    .catch((err: unknown) =>
      console.error("[AuthService] Failed to publish auth.updated event:", err),
    );
};

export const register = async (
  input: RegisterInput,
  context: RequestContext,
): Promise<{ message: string; email: string }> => {
  const existing = await authRepository.findUserByEmail(input.email);

  if (existing?.isEmailVerified) {
    throw new AppError("An account with this email already exists", 409, "CONFLICT");
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

  await issueAndSendOtp(user, OtpPurpose.Registration, context);
  await AuditService.write({ userId: user.id, action: AuditAction.Register, context });

  return {
    message: "Registration initiated. Please verify the code sent to your email.",
    email: user.email,
  };
};

export const resendOtp = async (
  input: ResendOtpInput,
  context: RequestContext,
): Promise<{ message: string }> => {
  const user = await authRepository.findUserByEmail(input.email);
  if (!user) {
    // Registration is the one flow where account existence is already
    // knowable from the register form itself, so we keep this specific;
    // every other purpose intentionally stays generic (see below).
    return { message: GENERIC_OTP_SENT_MESSAGE };
  }

  if (input.purpose === OtpPurpose.Registration && user.isEmailVerified) {
    throw new AppError("This email is already verified. Please sign in.", 409, "CONFLICT");
  }
  if (input.purpose !== OtpPurpose.Registration && !user.isEmailVerified) {
    return { message: GENERIC_OTP_SENT_MESSAGE };
  }

  await issueAndSendOtp(user, input.purpose, context);
  return { message: GENERIC_OTP_SENT_MESSAGE };
};

export const verifyRegistrationOtp = async (
  input: VerifyRegistrationOtpInput,
  context: RequestContext,
): Promise<AuthSession> => {
  const user = await authRepository.findUserByEmail(input.email);
  if (!user) {
    throw new AppError("Invalid email or verification code", 400);
  }
  if (user.isEmailVerified) {
    throw new AppError("This email is already verified. Please sign in.", 409, "CONFLICT");
  }

  await consumeOtpOrThrow(
    OtpPurpose.Registration,
    user,
    input.code,
    context,
    "Invalid or expired verification code",
  );

  const verifiedUser = await authRepository.markEmailVerified(user.id);
  await authRepository.recordSuccessfulLogin(user.id, context.ipAddress);
  await AuditService.write({
    userId: user.id,
    action: AuditAction.LoginSuccess,
    context,
    metadata: { via: "REGISTRATION_VERIFIED" },
  });

  const tokens = await TokenService.issueSession(toTokenContext(verifiedUser), context);
  await EmailQueue.sendWelcomeEmail({ to: verifiedUser.email, firstName: verifiedUser.firstName });
  await publishAuthUpdated(verifiedUser, "REGISTERED");

  const safeUser = toSafeUser(verifiedUser);
  await cacheUserSession(safeUser);
  return { user: safeUser, tokens };
};

export const login = async (input: LoginInput, context: RequestContext): Promise<AuthSession> => {
  const user = await authRepository.findUserByEmail(input.email);
  if (!user) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    throw new AppError(
      `Too many failed attempts. Try again after ${user.lockedUntil.toISOString()}`,
      423,
      "ACCOUNT_LOCKED",
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
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  assertLoginable(user);

  await authRepository.recordSuccessfulLogin(user.id, context.ipAddress);
  await AuditService.write({
    userId: user.id,
    action: AuditAction.LoginSuccess,
    context,
    metadata: { via: "PASSWORD" },
  });

  const tokens = await TokenService.issueSession(toTokenContext(user), context, input.rememberMe);
  const safeUser = toSafeUser(user);
  await cacheUserSession(safeUser);

  messageBus
    .publishEvent(MessageExchanges.DOMAIN_EVENTS, MessageRoutingKeys.AUTH_SIGNIN, {
      userId: user.publicId,
      email: user.email,
      timestamp: new Date().toISOString(),
    })
    .catch((err: unknown) => console.error("[AuthService] Failed to publish signin event:", err));

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
    throw new AppError("Invalid email or code", 401, "INVALID_CREDENTIALS");
  }

  await consumeOtpOrThrow(OtpPurpose.Login, user, input.code, context, "Invalid or expired code");
  assertLoginable(user);

  await authRepository.recordSuccessfulLogin(user.id, context.ipAddress);
  await AuditService.write({
    userId: user.id,
    action: AuditAction.LoginSuccess,
    context,
    metadata: { via: "OTP" },
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
    throw new AppError("Invalid email or code", 400);
  }

  await consumeOtpOrThrow(
    OtpPurpose.PasswordReset,
    user,
    input.code,
    context,
    "Invalid or expired code",
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
    eventLabel: "Your password was reset",
    ipAddress: context.ipAddress,
  });
  await publishAuthUpdated(user, "PASSWORD_RESET");

  return { message: "Password has been reset. Please sign in with your new password." };
};

export const changePassword = async (
  principalId: string,
  input: ChangePasswordInput,
  context: RequestContext,
): Promise<{ message: string }> => {
  const user = await authRepository.findUserByPublicId(principalId);
  if (!user) {
    throw new AppError("Account not found", 404);
  }

  const isValid = await verifyPassword(user.id, input.currentPassword);
  if (!isValid) {
    throw new AppError("Current password is incorrect", 401, "INVALID_CREDENTIALS");
  }

  const credentials = await PasswordUtil.hash(input.newPassword);
  await authRepository.updatePassword(user.id, credentials);

  await TokenService.revokeAllSessions(user.id);
  await TokenService.bumpTokenVersion(user.id);

  await AuditService.write({ userId: user.id, action: AuditAction.PasswordChanged, context });
  await EmailQueue.sendSecurityAlertEmail({
    to: user.email,
    firstName: user.firstName,
    eventLabel: "Your password was changed",
    ipAddress: context.ipAddress,
  });
  await publishAuthUpdated(user, "PASSWORD_CHANGED");

  return { message: "Password changed. You have been signed out of all other sessions." };
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
  return { message: "Logged out successfully" };
};

export const logoutAll = async (
  principalId: string,
  context: RequestContext,
): Promise<{ message: string }> => {
  const user = await authRepository.findUserByPublicId(principalId);
  if (!user) {
    throw new AppError("Account not found", 404);
  }

  await TokenService.revokeAllSessions(user.id);
  await TokenService.bumpTokenVersion(user.id);
  await AuditService.write({ userId: user.id, action: AuditAction.LogoutAll, context });
  return { message: "Logged out from all devices" };
};

export const getCurrentUser = async (principalId: string): Promise<SafeUser> => {
  const user = await authRepository.findUserByPublicId(principalId);
  if (!user) {
    throw new AppError("Account not found", 404);
  }
  return toSafeUser(user);
};

export default {
  register,
  resendOtp,
  verifyRegistrationOtp,
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
