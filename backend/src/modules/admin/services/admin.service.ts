import { Status, AuditAction } from '@prisma/client';
import { adminRepository } from '@/modules/admin/repositories/admin.repository.js';
import { AdminTokenService } from '@/modules/admin/services/admin-token.service.js';
import { PasswordUtil } from '@/shared/security/password.util.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { toSafeAdmin } from '@/modules/admin/utils/admin.mapper.js';
import {
  messageBus,
  MessageExchanges,
  MessageRoutingKeys,
} from '@/infrastructure/messaging/index.js';
import type {
  AdminChangePasswordInput,
  AdminLoginInput,
  AdminLogoutInput,
  AdminRefreshTokenInput,
} from '@/modules/admin/validations/admin.schema.js';
import type {
  AdminSession,
  AuthTokens,
  RequestContext,
  SafeAdmin,
  SystemStats,
} from '@/modules/admin/types/admin.types.js';

export const login = async (
  input: AdminLoginInput,
  context: RequestContext,
): Promise<AdminSession> => {
  const admin = await adminRepository.findByEmail(input.email);
  if (!admin) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  if (admin.lockedUntil && admin.lockedUntil.getTime() > Date.now()) {
    throw new AppError(
      `Too many failed attempts. Try again after ${admin.lockedUntil.toISOString()}`,
      423,
      'ACCOUNT_LOCKED',
    );
  }

  const credentials = await adminRepository.getPasswordCredentials(admin.id);
  const passwordValid = credentials
    ? await PasswordUtil.verify(input.password, credentials.passwordHash, credentials.passwordSalt)
    : false;

  if (!passwordValid) {
    const { lockedUntil } = await adminRepository.recordFailedLogin(admin.id);
    await adminRepository.writeAuditLog({
      adminId: admin.id,
      action: AuditAction.LoginFailed,
      context,
    });
    if (lockedUntil) {
      await adminRepository.writeAuditLog({
        adminId: admin.id,
        action: AuditAction.AccountLocked,
        context,
        metadata: { lockedUntil },
      });
    }
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  if (admin.status === Status.Suspended || admin.status === Status.Deactivated) {
    throw new AppError(
      'This admin account is not active. Contact a platform owner.',
      403,
      'ACCOUNT_NOT_ACTIVE',
    );
  }

  await adminRepository.recordSuccessfulLogin(admin.id, context.ipAddress);
  await adminRepository.writeAuditLog({
    adminId: admin.id,
    action: AuditAction.LoginSuccess,
    context,
    metadata: { via: 'PASSWORD' },
  });

  const tokens = await AdminTokenService.issueSession(
    {
      id: admin.id,
      publicId: admin.publicId,
      email: admin.email,
      role: admin.role.name,
      tokenVersion: admin.tokenVersion,
    },
    context,
    input.rememberMe,
  );

  return { admin: toSafeAdmin(admin), tokens };
};

export const changePassword = async (
  principalId: string,
  input: AdminChangePasswordInput,
  context: RequestContext,
): Promise<{ message: string }> => {
  const admin = await adminRepository.findByPublicId(principalId);
  if (!admin) {
    throw new AppError('Account not found', 404);
  }

  const credentials = await adminRepository.getPasswordCredentials(admin.id);
  const isValid = credentials
    ? await PasswordUtil.verify(
        input.currentPassword,
        credentials.passwordHash,
        credentials.passwordSalt,
      )
    : false;
  if (!isValid) {
    throw new AppError('Current password is incorrect', 401, 'INVALID_CREDENTIALS');
  }

  const newCredentials = await PasswordUtil.hash(input.newPassword);
  await adminRepository.updatePassword(admin.id, newCredentials);

  await AdminTokenService.revokeAllSessions(admin.id);
  await AdminTokenService.bumpTokenVersion(admin.id);

  await adminRepository.writeAuditLog({
    adminId: admin.id,
    action: AuditAction.PasswordChanged,
    context,
  });

  await messageBus
    .publishEvent(MessageExchanges.DOMAIN_EVENTS, MessageRoutingKeys.AUTH_UPDATED, {
      adminId: admin.publicId,
      email: admin.email,
      reason: 'PASSWORD_CHANGED',
      timestamp: new Date().toISOString(),
    })
    .catch((err: unknown) =>
      console.error('[AdminService] Failed to publish auth.updated event:', err),
    );

  return { message: 'Password changed. You have been signed out of all other sessions.' };
};

export const refreshSession = async (
  input: AdminRefreshTokenInput,
  context: RequestContext,
): Promise<AuthTokens> => {
  return AdminTokenService.rotateSession(input.refreshToken, context);
};

export const logout = async (
  input: AdminLogoutInput,
  context: RequestContext,
): Promise<{ message: string }> => {
  await AdminTokenService.revokeSession(input.refreshToken, context);
  return { message: 'Logged out successfully' };
};

export const logoutAll = async (
  principalId: string,
  context: RequestContext,
): Promise<{ message: string }> => {
  const admin = await adminRepository.findByPublicId(principalId);
  if (!admin) {
    throw new AppError('Account not found', 404);
  }

  await AdminTokenService.revokeAllSessions(admin.id);
  await AdminTokenService.bumpTokenVersion(admin.id);
  await adminRepository.writeAuditLog({
    adminId: admin.id,
    action: AuditAction.LogoutAll,
    context,
  });
  return { message: 'Logged out from all devices' };
};

export const getCurrentAdmin = async (principalId: string): Promise<SafeAdmin> => {
  const admin = await adminRepository.findByPublicId(principalId);
  if (!admin) {
    throw new AppError('Account not found', 404);
  }
  return toSafeAdmin(admin);
};

export const getSystemStats = async (): Promise<SystemStats> => {
  return adminRepository.getSystemStats();
};

export const validateAdmin = async (principalId: string): Promise<boolean> => {
  const admin = await adminRepository.findByPublicId(principalId);
  return admin !== null && admin.status === Status.Active;
};

export default {
  login,
  changePassword,
  refreshSession,
  logout,
  logoutAll,
  getCurrentAdmin,
  getSystemStats,
  validateAdmin,
};
